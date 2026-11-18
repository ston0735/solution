import { describe, expect, it } from "vitest";
import { isStoredBlobUrl } from "./blobStore";
import {
  createPreviewCacheKey,
  getClientIp,
  getRateLimitBypassIps,
  hashClientIp,
  isRateLimitBypassed,
} from "./limits";

describe("wrap preview request guards", () => {
  it("reads the first client address from the proxy chain", () => {
    expect(
      getClientIp({ "x-forwarded-for": " 203.0.113.9, 70.41.3.18 " })
    ).toBe("203.0.113.9");
    expect(getClientIp({ "x-real-ip": "198.51.100.4" })).toBe("198.51.100.4");
    expect(getClientIp({})).toBe("unknown");
  });

  it("hashes an address without keeping it in storage keys", () => {
    const hashed = hashClientIp("203.0.113.9");
    expect(hashed).not.toContain("203.0.113.9");
    expect(hashed).toBe(hashClientIp("203.0.113.9"));
    expect(hashed).not.toBe(hashClientIp("203.0.113.10"));
  });

  it("only honours exact bypass addresses and never wildcards", () => {
    process.env.WRAP_PREVIEW_RATE_LIMIT_BYPASS_IPS =
      " 203.0.113.7 , unknown, 198.51.100.0/24";
    expect(getRateLimitBypassIps()).toEqual(["203.0.113.7", "198.51.100.0/24"]);
    expect(isRateLimitBypassed("203.0.113.7")).toBe(true);
    expect(isRateLimitBypassed("203.0.113.8")).toBe(false);
    expect(isRateLimitBypassed("unknown")).toBe(false);
    delete process.env.WRAP_PREVIEW_RATE_LIMIT_BYPASS_IPS;
  });

  it("keeps the cache key stable for an identical request", () => {
    const input = {
      pantoneId: "SSB161M",
      imageBase64: "AAABBBCCCDDDEEEFFF",
      catalogColor: { code: "SSB161M" },
    };
    const first = createPreviewCacheKey("iphash", input);
    expect(first).toBe(createPreviewCacheKey("iphash", input));
    expect(
      createPreviewCacheKey("iphash", { ...input, pantoneId: "SRG181" })
    ).not.toBe(first);
    expect(createPreviewCacheKey("other", input)).not.toBe(first);
  });

  it("only accepts preview objects from the site's own store", () => {
    expect(
      isStoredBlobUrl(
        "https://abc123.private.blob.vercel-storage.com/generated/x.png"
      )
    ).toBe(true);
    expect(
      isStoredBlobUrl(
        "https://evil.example.com/private.blob.vercel-storage.com/generated/x.png"
      )
    ).toBe(false);
    expect(
      isStoredBlobUrl(
        "https://abc123.private.blob.vercel-storage.com/secret/y.png"
      )
    ).toBe(false);
    expect(isStoredBlobUrl("")).toBe(false);
  });
});
