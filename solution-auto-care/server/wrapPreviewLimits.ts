import { and, eq, gt, lt, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";
import type { ResultSetHeader } from "mysql2";
import { wrapPreviewCache, wrapPreviewUsage } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

export const WRAP_PREVIEW_DAILY_LIMIT = 2;
export const WRAP_PREVIEW_CONCURRENT_LIMIT = 1;
export const WRAP_PREVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_CLAIM_TTL_MS = 10 * 60 * 1000;

type PreviewCacheInput = {
  pantoneId: string;
  imageBase64: string;
  catalogColor?: unknown;
  partialWrapCustomizations?: unknown;
};

export type WrapPreviewUsageClaim = {
  ipHash: string;
  usageDay: string;
};

export type WrapPreviewGenerationOptions = {
  skipDailyLimit?: boolean;
};

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function getSecretSalt() {
  if (!ENV.cookieSecret) throw new Error("PREVIEW_LIMITER_UNAVAILABLE");
  return ENV.cookieSecret;
}

export function getUtcUsageDay(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function getClientIp(headers: IncomingHttpHeaders, fallbackIp?: string) {
  const forwarded = headers["x-forwarded-for"];
  const firstForwarded = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const candidate =
    firstForwarded?.split(",")[0]?.trim() || fallbackIp || "unknown";
  return candidate.slice(0, 128);
}

export function hashClientIp(ip: string, salt = getSecretSalt()) {
  return hash(`${salt}:wrap-preview-ip:${ip}`);
}

export function createWrapPreviewCacheKey(
  ipHash: string,
  input: PreviewCacheInput
) {
  const customization = Array.isArray(input.partialWrapCustomizations)
    ? [...input.partialWrapCustomizations].sort((first, second) =>
        JSON.stringify(first).localeCompare(JSON.stringify(second))
      )
    : input.partialWrapCustomizations;
  const fingerprint = JSON.stringify({
    pantoneId: input.pantoneId.trim().toUpperCase(),
    imageBase64: input.imageBase64,
    catalogColor: input.catalogColor ?? null,
    partialWrapCustomizations: customization ?? null,
  });
  return hash(`${ipHash}:wrap-preview-cache:${fingerprint}`);
}

function getAffectedRows(result: unknown) {
  if (Array.isArray(result))
    return Number(
      (result[0] as ResultSetHeader | undefined)?.affectedRows ?? 0
    );
  return Number((result as ResultSetHeader | undefined)?.affectedRows ?? 0);
}

export async function getCachedWrapPreview<T>(
  cacheKey: string
): Promise<T | undefined> {
  const db = await getDb();
  if (!db) throw new Error("PREVIEW_LIMITER_UNAVAILABLE");

  const rows = await db
    .select({ responseJson: wrapPreviewCache.responseJson })
    .from(wrapPreviewCache)
    .where(
      and(
        eq(wrapPreviewCache.cacheKey, cacheKey),
        gt(wrapPreviewCache.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!rows[0]?.responseJson) return undefined;
  try {
    return JSON.parse(rows[0].responseJson) as T;
  } catch {
    return undefined;
  }
}

export async function saveCachedWrapPreview(
  cacheKey: string,
  response: unknown
) {
  const db = await getDb();
  if (!db) throw new Error("PREVIEW_LIMITER_UNAVAILABLE");

  const now = new Date();
  const expiresAt = new Date(now.getTime() + WRAP_PREVIEW_CACHE_TTL_MS);
  await db
    .insert(wrapPreviewCache)
    .values({
      cacheKey,
      responseJson: JSON.stringify(response),
      expiresAt,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({
      set: {
        responseJson: JSON.stringify(response),
        expiresAt,
        updatedAt: now,
      },
    });
}

export async function claimWrapPreviewGeneration(
  ipHash: string,
  options: WrapPreviewGenerationOptions = {}
): Promise<WrapPreviewUsageClaim> {
  const db = await getDb();
  if (!db) throw new Error("PREVIEW_LIMITER_UNAVAILABLE");

  const usageDay = getUtcUsageDay();
  const now = new Date();
  const staleAt = new Date(now.getTime() - ACTIVE_CLAIM_TTL_MS);

  await db
    .insert(wrapPreviewUsage)
    .values({
      ipHash,
      usageDay,
      completedCount: 0,
      activeCount: 0,
      activeSince: null,
      createdAt: now,
      updatedAt: now,
    })
    .onDuplicateKeyUpdate({ set: { updatedAt: now } });

  const conditions = [
    eq(wrapPreviewUsage.ipHash, ipHash),
    eq(wrapPreviewUsage.usageDay, usageDay),
    options.skipDailyLimit
      ? undefined
      : lt(wrapPreviewUsage.completedCount, WRAP_PREVIEW_DAILY_LIMIT),
    or(
      lt(wrapPreviewUsage.activeCount, WRAP_PREVIEW_CONCURRENT_LIMIT),
      lt(wrapPreviewUsage.activeSince, staleAt)
    ),
  ].filter((condition): condition is NonNullable<typeof condition> =>
    Boolean(condition)
  );
  const result = await db
    .update(wrapPreviewUsage)
    .set({ activeCount: 1, activeSince: now, updatedAt: now })
    .where(and(...conditions));

  if (getAffectedRows(result) !== 1) {
    const rows = await db
      .select({ completedCount: wrapPreviewUsage.completedCount })
      .from(wrapPreviewUsage)
      .where(
        and(
          eq(wrapPreviewUsage.ipHash, ipHash),
          eq(wrapPreviewUsage.usageDay, usageDay)
        )
      )
      .limit(1);
    if (
      !options.skipDailyLimit &&
      (rows[0]?.completedCount ?? 0) >= WRAP_PREVIEW_DAILY_LIMIT
    )
      throw new Error("PREVIEW_DAILY_LIMIT");
    throw new Error("PREVIEW_CONCURRENT_LIMIT");
  }

  return { ipHash, usageDay };
}

export async function finishWrapPreviewGeneration(
  claim: WrapPreviewUsageClaim,
  completed: boolean
) {
  const db = await getDb();
  if (!db) return;

  const where = and(
    eq(wrapPreviewUsage.ipHash, claim.ipHash),
    eq(wrapPreviewUsage.usageDay, claim.usageDay)
  );
  const now = new Date();
  if (completed) {
    await db
      .update(wrapPreviewUsage)
      .set({
        activeCount: 0,
        activeSince: null,
        completedCount: sql`${wrapPreviewUsage.completedCount} + 1`,
        updatedAt: now,
      })
      .where(where);
    return;
  }

  await db
    .update(wrapPreviewUsage)
    .set({ activeCount: 0, activeSince: null, updatedAt: now })
    .where(where);
}
