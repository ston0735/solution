import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyCmsBlobFailure, withCmsBlobToken } from "./store";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CMS Blob credential selection", () => {
  it("explicitly prefers the configured read-write token over ambient OIDC options", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "test-read-write-token");

    expect(
      withCmsBlobToken({ access: "private", oidcToken: "ambient-oidc" })
    ).toEqual({
      access: "private",
      oidcToken: "ambient-oidc",
      token: "test-read-write-token",
    });
  });

  it("keeps supplied Blob options unchanged when no read-write token exists", () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    const options = { access: "private", storeId: "store-test" };

    expect(withCmsBlobToken(options)).toEqual(options);
  });
});

describe("CMS Blob failure diagnostics", () => {
  it("classifies access failures without exposing the original message", () => {
    const diagnostic = classifyCmsBlobFailure(
      new Error("Access denied for token must-not-appear-in-logs")
    );

    expect(diagnostic.category).toBe("credential_or_access");
    expect(diagnostic.messageFingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(diagnostic)).not.toContain("must-not-appear-in-logs");
  });

  it("classifies ETag conditional write failures", () => {
    expect(
      classifyCmsBlobFailure(new Error("ifMatch ETag precondition failed"))
        .category
    ).toBe("conditional_write_conflict");
  });
});
