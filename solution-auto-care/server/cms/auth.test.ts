import { describe, expect, it, vi, afterEach } from "vitest";
import type { Request } from "express";
import { authenticateCmsAdmin, getCmsSessionToken } from "./auth";
import { CmsAuthError } from "./errors";
import {
  createCmsUserStore,
  getCmsAuthPath,
  type CmsAuthBlobClient,
} from "./userStore";
import type { CmsBlobGetResult } from "./store";

type Entry = {
  body: Buffer;
  etag: string;
  contentType: string;
};

class MockBlobClient implements CmsAuthBlobClient {
  readonly blobs = new Map<string, Entry>();
  private nextEtag = 1;

  async get(pathname: string): Promise<CmsBlobGetResult | null> {
    const entry = this.blobs.get(pathname);
    if (!entry) return null;
    return {
      statusCode: 200,
      stream: new Response(new Uint8Array(entry.body)).body,
      blob: { pathname, contentType: entry.contentType, etag: entry.etag },
    };
  }

  async put(
    pathname: string,
    body: unknown,
    options: { allowOverwrite: boolean; contentType?: string; ifMatch?: string }
  ): Promise<void> {
    const existing = this.blobs.get(pathname);
    if (existing && !options.allowOverwrite) {
      throw Object.assign(new Error("already exists"), { status: 409 });
    }
    if (existing && options.ifMatch !== existing.etag) {
      throw Object.assign(new Error("precondition failed"), {
        name: "BlobPreconditionFailedError",
        status: 412,
      });
    }
    const buffer = Buffer.isBuffer(body)
      ? body
      : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    this.blobs.set(pathname, {
      body: buffer,
      contentType:
        options.contentType?.split(";", 1)[0] ?? "application/octet-stream",
      etag: `etag-${this.nextEtag++}`,
    });
  }
}

function requestWithCookie(token: string): Request {
  return {
    headers: { cookie: `solution_cms_session=${encodeURIComponent(token)}` },
  } as unknown as Request;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CMS local session authentication", () => {
  it("seeds only after a correct bootstrap login and never stores a plaintext password", async () => {
    vi.stubEnv("CMS_BOOTSTRAP_USERNAME", "owner-test");
    vi.stubEnv("CMS_BOOTSTRAP_PASSWORD", "weak-start");
    vi.stubEnv("VERCEL_ENV", "preview");
    const blob = new MockBlobClient();
    const store = createCmsUserStore(blob, { configured: true });
    const authPath = getCmsAuthPath("preview");

    await expect(
      store.login("owner-test", "wrong-start", "test-initial-wrong")
    ).rejects.toMatchObject({ status: 401 });
    expect(blob.blobs.has(authPath)).toBe(false);

    const login = await store.login(
      "OWNER-TEST",
      "weak-start",
      "test-initial-correct"
    );
    expect(login.principal).toMatchObject({
      role: "admin",
      cmsRole: "owner",
      username: "owner-test",
      mustChangePassword: true,
    });
    expect(login.sessionToken).toHaveLength(43);
    expect(blob.blobs.has(authPath)).toBe(true);

    const stored = await store.readSnapshot();
    expect(stored.document?.accounts[0]).not.toHaveProperty(
      "password",
      "weak-start"
    );
    expect(stored.document?.accounts[0].passwordHash).not.toContain(
      "weak-start"
    );
    expect(stored.document?.sessions[0].tokenHash).not.toBe(login.sessionToken);

    const principal = await authenticateCmsAdmin(
      requestWithCookie(login.sessionToken),
      store
    );
    expect(principal).toMatchObject({
      username: "owner-test",
      cmsRole: "owner",
    });
    expect(getCmsSessionToken(requestWithCookie(login.sessionToken))).toBe(
      login.sessionToken
    );
  });

  it("rejects missing or invalid local cookies and never calls a remote provider", async () => {
    const store = {
      authenticateSession: vi.fn(async () => {
        throw new CmsAuthError(503, "Authentication service unavailable.");
      }),
    } as never;
    await expect(
      authenticateCmsAdmin({ headers: {} } as Request, store)
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      authenticateCmsAdmin(
        requestWithCookie("not-a-valid-session-token"),
        store
      )
    ).rejects.toMatchObject({ status: 503 });
    expect(
      (store as { authenticateSession: ReturnType<typeof vi.fn> })
        .authenticateSession
    ).toHaveBeenCalledTimes(1);
  });
});
