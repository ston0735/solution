import { describe, expect, it } from "vitest";
import { getSafeOAuthReturnUrl } from "./oauth";

describe("OAuth return URL validation", () => {
  it("keeps the public Solution frontend path and strips fragments", () => {
    expect(
      getSafeOAuthReturnUrl(
        "https://solution-car-wrap.vercel.app/member?source=login#unsafe-token"
      )
    ).toBe("https://solution-car-wrap.vercel.app/member?source=login");
  });

  it("rejects arbitrary external redirect targets", () => {
    expect(getSafeOAuthReturnUrl("https://example.com/steal-session")).toBe(
      "https://solution-car-wrap.vercel.app/member"
    );
    expect(getSafeOAuthReturnUrl("not-a-url")).toBe(
      "https://solution-car-wrap.vercel.app/member"
    );
  });
});
