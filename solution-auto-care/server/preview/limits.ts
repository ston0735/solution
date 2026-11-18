import { createHash } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import { PREVIEW_BLOB_PREFIX, PREVIEW_ENV } from "./env";
import {
  deleteByUrl,
  listByPrefix,
  putBlobFile,
  readLatestJson,
} from "./blobStore";

/**
 * Blob-backed usage guard for the Vercel preview service.
 *
 * It reproduces the production behaviour that the MySQL limiter implemented:
 * a per-IP daily allowance, one in-flight generation per IP, and a result
 * cache so the same request does not bill OpenAI twice. Objects are immutable,
 * so usage is counted by listing markers and leases expire on a staleness
 * window instead of relying on a transaction.
 */
const LEASE_STALENESS_MS = 120_000;

export type PreviewUsageClaim = {
  leaseUrl: string;
  usageUrl?: string;
};

export function getClientIp(
  headers: IncomingHttpHeaders | Record<string, unknown>
): string {
  const forwarded = headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return String(forwarded[0]).split(",")[0]?.trim() || "unknown";
  }
  const realIp = headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) return realIp.trim();
  return "unknown";
}

export function hashClientIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}|wrap-preview-vercel`)
    .digest("hex")
    .slice(0, 32);
}

export function getRateLimitBypassIps(): string[] {
  // Read live so a redeploy with a new value takes effect immediately and the
  // helper stays testable without re-importing the module.
  return (process.env.WRAP_PREVIEW_RATE_LIMIT_BYPASS_IPS ?? "")
    .split(",")
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0 && entry.toLowerCase() !== "unknown");
}

export function isRateLimitBypassed(ip: string): boolean {
  if (!ip || ip === "unknown") return false;
  return getRateLimitBypassIps().some(entry => entry === ip);
}

export function createPreviewCacheKey(
  ipHash: string,
  input: Record<string, unknown>
): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        ipHash,
        pantoneId: input.pantoneId ?? "",
        catalogColor: input.catalogColor ?? null,
        partialWrapCustomizations: input.partialWrapCustomizations ?? [],
        image: String(input.imageBase64 ?? "").length,
        imageFingerprint: createHash("sha256")
          .update(String(input.imageBase64 ?? "").slice(0, 4096))
          .digest("hex")
          .slice(0, 16),
      })
    )
    .digest("hex")
    .slice(0, 40);
  return `${PREVIEW_BLOB_PREFIX}/cache/${digest}`;
}

export async function getCachedPreview<T>(
  cacheKey: string
): Promise<T | undefined> {
  try {
    return await readLatestJson<T>(cacheKey);
  } catch {
    return undefined;
  }
}

export async function saveCachedPreview(
  cacheKey: string,
  payload: unknown
): Promise<void> {
  try {
    await putBlobFile(
      `${cacheKey}.json`,
      JSON.stringify(payload),
      "application/json"
    );
  } catch (error) {
    console.error("[WrapPreview] cache write failed", error);
  }
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function putMarker(prefix: string): Promise<string> {
  return putBlobFile(
    `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
    JSON.stringify({ at: new Date().toISOString() }),
    "application/json"
  );
}

export async function claimGeneration(
  ipHash: string,
  options: { skipDailyLimit: boolean }
): Promise<PreviewUsageClaim> {
  const leasePrefix = `${PREVIEW_BLOB_PREFIX}/lease/${ipHash}/`;
  const leases = await listByPrefix(leasePrefix, 20).catch(() => []);
  const freshCutoff = Date.now() - LEASE_STALENESS_MS;
  const active = leases.filter(marker => {
    const uploadedAt = Date.parse(marker.uploadedAt);
    return Number.isFinite(uploadedAt) && uploadedAt > freshCutoff;
  });
  if (active.length >= PREVIEW_ENV.concurrentGenerationsPerIp) {
    throw new Error("PREVIEW_CONCURRENT_LIMIT");
  }

  let usageUrl: string | undefined;
  if (!options.skipDailyLimit) {
    const usagePrefix = `${PREVIEW_BLOB_PREFIX}/usage/${ipHash}/${todayKey()}/`;
    const usage = await listByPrefix(usagePrefix, 50).catch(() => []);
    if (usage.length >= PREVIEW_ENV.dailyGenerationsPerIp) {
      throw new Error("PREVIEW_DAILY_LIMIT");
    }
    usageUrl = await putMarker(usagePrefix).catch(() => undefined);
  }

  const leaseUrl = await putMarker(leasePrefix);
  return { leaseUrl, usageUrl };
}

export async function releaseGeneration(
  claim: PreviewUsageClaim,
  completed: boolean
): Promise<void> {
  await deleteByUrl(claim.leaseUrl);
  if (!completed && claim.usageUrl) {
    // A failed generation must not consume the visitor's daily allowance, so
    // the exact usage marker for this attempt is removed again.
    await deleteByUrl(claim.usageUrl);
  }
}
