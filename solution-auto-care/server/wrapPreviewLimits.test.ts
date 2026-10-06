import { describe, expect, it } from "vitest";
import {
  createWrapPreviewCacheKey,
  getClientIp,
  getUtcUsageDay,
  getWrapPreviewRateLimitBypassIps,
  hashClientIp,
  isWrapPreviewRateLimitBypassed,
} from "./wrapPreviewLimits";
import { getWrapPreviewErrorMessage } from "./wrapPreview";

const input = {
  pantoneId: "SRG181",
  imageBase64: "vehicle-image-base64",
  catalogColor: {
    code: "SRG181",
    category: "綠色系",
    categoryEn: "Green",
    name: "",
    nameZh: "",
    swatch: "#07A792",
  },
  partialWrapCustomizations: [
    { part: "roof", finish: "carbon_fiber" },
    { part: "mirrors", finish: "blackout" },
  ],
};

describe("wrap preview usage safeguards", () => {
  it("uses the first forwarded address and never exposes raw IPs in its hash", () => {
    expect(
      getClientIp({ "x-forwarded-for": "198.51.100.18, 10.0.0.1" }, "127.0.0.1")
    ).toBe("198.51.100.18");
    const ipHash = hashClientIp("198.51.100.18", "test-salt");
    expect(ipHash).toMatch(/^[a-f0-9]{64}$/);
    expect(ipHash).not.toContain("198.51.100.18");
  });

  it("uses one cache key for the same image and unordered partial wrap options", () => {
    const ipHash = hashClientIp("198.51.100.18", "test-salt");
    const original = createWrapPreviewCacheKey(ipHash, input);
    const reordered = createWrapPreviewCacheKey(ipHash, {
      ...input,
      partialWrapCustomizations: [...input.partialWrapCustomizations].reverse(),
    });
    expect(original).toBe(reordered);
    expect(original).not.toBe(
      createWrapPreviewCacheKey(hashClientIp("203.0.113.7", "test-salt"), input)
    );
  });

  it("uses a UTC calendar day for the daily generation budget", () => {
    expect(getUtcUsageDay(new Date("2026-10-02T23:59:59.000Z"))).toBe(
      "2026-10-02"
    );
    expect(getUtcUsageDay(new Date("2026-10-03T00:00:00.000Z"))).toBe(
      "2026-10-03"
    );
  });

  it("matches only exact configured IP bypass entries", () => {
    const bypassIps = getWrapPreviewRateLimitBypassIps(
      "198.51.100.18, unknown, *, 198.51.100.0/24"
    );
    expect(bypassIps).toEqual(["198.51.100.18"]);
    expect(isWrapPreviewRateLimitBypassed("198.51.100.18", bypassIps)).toBe(
      true
    );
    expect(isWrapPreviewRateLimitBypassed("198.51.100.19", bypassIps)).toBe(
      false
    );
    expect(isWrapPreviewRateLimitBypassed("unknown", bypassIps)).toBe(false);
  });

  it("turns daily and concurrent limits into customer-safe Traditional Chinese messages", () => {
    expect(
      getWrapPreviewErrorMessage(new Error("PREVIEW_DAILY_LIMIT"))
    ).toContain("每天最多可建立 2 張");
    expect(
      getWrapPreviewErrorMessage(new Error("PREVIEW_CONCURRENT_LIMIT"))
    ).toContain("正在生成中");
    expect(
      getWrapPreviewErrorMessage(new Error("PREVIEW_LIMITER_UNAVAILABLE"))
    ).toContain("未受控費用");
  });
});
