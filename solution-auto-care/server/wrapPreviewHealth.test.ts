import { describe, expect, it } from "vitest";
import { getWrapPreviewHealth } from "./wrapPreviewHealth";

describe("wrap preview health", () => {
  it("reports the server-only OpenAI provider, model, and enforced limits without generating an image", () => {
    expect(getWrapPreviewHealth()).toEqual({
      provider: "openai",
      model: "gpt-image-2",
      credentialConfigured: true,
      limits: {
        dailyGenerationsPerIp: 2,
        concurrentGenerationsPerIp: 1,
      },
    });
  });
});
