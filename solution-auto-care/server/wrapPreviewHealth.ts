import { OPENAI_IMAGE_MODEL } from "./_core/imageGeneration";
import { ENV } from "./_core/env";
import { WRAP_PREVIEW_CONCURRENT_LIMIT, WRAP_PREVIEW_DAILY_LIMIT } from "./wrapPreviewLimits";

/** Safe operational metadata for validating the deployed preview service. */
export function getWrapPreviewHealth() {
  return {
    provider: "openai" as const,
    model: OPENAI_IMAGE_MODEL,
    credentialConfigured: Boolean(ENV.openAiApiKey),
    limits: {
      dailyGenerationsPerIp: WRAP_PREVIEW_DAILY_LIMIT,
      concurrentGenerationsPerIp: WRAP_PREVIEW_CONCURRENT_LIMIT,
    },
  };
}
