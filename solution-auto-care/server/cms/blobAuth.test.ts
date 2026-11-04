import { afterEach, describe, expect, it, vi } from "vitest";
import { withCmsBlobToken } from "./store";

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
