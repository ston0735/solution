/**
 * Server-side configuration for the Vercel-hosted wrap preview service.
 *
 * The values mirror the Manus production backend so behaviour, limits and the
 * customer-facing messages stay identical while the service runs on Vercel.
 */
function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const PREVIEW_ENV = {
  /** Only ever read server-side; never shipped to the browser bundle. */
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  imageModel: process.env.WRAP_PREVIEW_IMAGE_MODEL ?? "gpt-image-2",
  dailyGenerationsPerIp: readPositiveInteger(
    process.env.WRAP_PREVIEW_DAILY_LIMIT,
    2
  ),
  concurrentGenerationsPerIp: readPositiveInteger(
    process.env.WRAP_PREVIEW_CONCURRENT_LIMIT,
    1
  ),
  rateLimitBypassIps: process.env.WRAP_PREVIEW_RATE_LIMIT_BYPASS_IPS ?? "",
  /** Member auth bridge used to resolve an HttpOnly session server-to-server. */
  memberBridgeOrigin:
    process.env.WRAP_PREVIEW_MEMBER_BRIDGE_ORIGIN ??
    "https://solutionauth-zcgxwa4c.manus.space",
  /** Legacy storage origin kept as the fallback source of material cards. */
  materialCardFallbackOrigin:
    process.env.WRAP_PREVIEW_MATERIAL_FALLBACK_ORIGIN ??
    "https://solauto1care-rmvw9wqm.manus.space",
};

export const PREVIEW_BLOB_PREFIX = "wrap-preview";
