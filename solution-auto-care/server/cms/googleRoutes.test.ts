import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { CmsAuthError } from "./errors";
import { createCmsApp } from "./routes.ts";
import {
  createCmsStore,
  type CmsBlobClient,
  type CmsBlobGetResult,
} from "./store";
import { createCmsUserStore, type CmsAuthBlobClient } from "./userStore";

type Entry = { body: Buffer; etag: string; contentType: string };

class MockBlobClient implements CmsBlobClient, CmsAuthBlobClient {
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
      throw Object.assign(new Error("precondition failed"), { status: 412 });
    }
    const buffer = Buffer.isBuffer(body)
      ? body
      : Buffer.from(typeof body === "string" ? body : JSON.stringify(body));
    this.blobs.set(pathname, {
      body: buffer,
      etag: `etag-${this.nextEtag++}`,
      contentType:
        options.contentType?.split(";", 1)[0] ?? "application/octet-stream",
    });
  }
}

const writeHeaders = {
  Origin: "http://127.0.0.1:3000",
  "X-Solution-CMS": "1",
};

async function startApp(app: ReturnType<typeof createCmsApp>) {
  const server: Server = createServer(app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("server did not start");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close(error => (error ? reject(error) : resolve()))
      ),
  };
}

async function request(
  baseUrl: string,
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; headers: Headers; body: any }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  return {
    status: response.status,
    headers: response.headers,
    body:
      contentType.includes("application/json") && text
        ? JSON.parse(text)
        : null,
  };
}

function cookieFrom(response: { headers: Headers }, name: string): string {
  const raw = response.headers.get("set-cookie") ?? "";
  const match = raw.match(new RegExp(`${name}=[^;]+`));
  if (!match) throw new Error(`missing ${name} cookie`);
  return match[0];
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("CMS Google routes", () => {
  it("returns a dynamic no-secret config and refuses nonce issuance before CMS initialization", async () => {
    vi.stubEnv(
      "CMS_GOOGLE_CLIENT_ID",
      "cms-client-id.apps.googleusercontent.com"
    );
    const blob = new MockBlobClient();
    const app = createCmsApp({
      store: createCmsStore(blob, { configured: true }),
      userStore: createCmsUserStore(blob, { configured: true }),
    });
    const running = await startApp(app);
    try {
      const config = await request(running.baseUrl, "/api/cms/google/config");
      expect(config.status).toBe(200);
      expect(config.body).toEqual({
        clientId: "cms-client-id.apps.googleusercontent.com",
        configured: true,
      });
      expect(config.headers.get("cache-control")).toBe("no-store");

      const nonce = await request(running.baseUrl, "/api/cms/google/nonce", {
        method: "POST",
        headers: writeHeaders,
        body: "{}",
      });
      expect(nonce.status).toBe(503);
      expect(blob.blobs.size).toBe(0);
    } finally {
      await running.close();
    }
  });

  it("links only through an owner, applies the local nonce cookie policy, and rejects nonce replay", async () => {
    vi.stubEnv("CMS_BOOTSTRAP_USERNAME", "owner-test");
    vi.stubEnv("CMS_BOOTSTRAP_PASSWORD", "weak-start");
    vi.stubEnv(
      "CMS_GOOGLE_CLIENT_ID",
      "cms-client-id.apps.googleusercontent.com"
    );
    vi.stubEnv("VERCEL_ENV", "development");
    const blob = new MockBlobClient();
    const userStore = createCmsUserStore(blob, { configured: true });
    const credentialNonces = new Map<string, string>();
    const googleVerifier = vi.fn(
      async (credential: string, nonce: string, _clientId: string) => {
        if (credentialNonces.get(credential) !== nonce) {
          throw new CmsAuthError(401, "Google nonce mismatch.");
        }
        return {
          sub: "owner-sub-1",
          email: "owner@gmail.com",
          emailVerified: true,
          nonce,
        };
      }
    );
    const app = createCmsApp({
      store: createCmsStore(blob, { configured: true }),
      userStore,
      googleVerifier,
    });
    const running = await startApp(app);
    try {
      const ownerLogin = await request(running.baseUrl, "/api/cms/login", {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          username: "owner-test",
          password: "weak-start",
        }),
      });
      const ownerInitialCookie = cookieFrom(ownerLogin, "solution_cms_session");
      const password = await request(running.baseUrl, "/api/cms/password", {
        method: "POST",
        headers: { ...writeHeaders, Cookie: ownerInitialCookie },
        body: JSON.stringify({
          currentPassword: "weak-start",
          newPassword: "replacement-password-12",
        }),
      });
      const ownerCookie = cookieFrom(password, "solution_cms_session");

      const users = await request(running.baseUrl, "/api/cms/users", {
        headers: { Cookie: ownerCookie },
      });
      const owner = users.body.users.find(
        (user: { username: string }) => user.username === "owner-test"
      );
      const linked = await request(running.baseUrl, "/api/cms/users/google", {
        method: "PUT",
        headers: { ...writeHeaders, Cookie: ownerCookie },
        body: JSON.stringify({
          id: owner.id,
          email: "OWNER@GMAIL.COM",
          revision: users.body.revision,
        }),
      });
      expect(linked.status).toBe(200);
      expect(
        linked.body.users.find((user: { id: string }) => user.id === owner.id)
      ).toMatchObject({
        googleEmail: "owner@gmail.com",
        googleLinked: false,
      });

      const nonce = await request(running.baseUrl, "/api/cms/google/nonce", {
        method: "POST",
        headers: writeHeaders,
        body: "{}",
      });
      expect(nonce.status).toBe(200);
      expect(nonce.headers.get("set-cookie")).toContain(
        "solution_cms_google_nonce_"
      );
      expect(nonce.headers.get("set-cookie")).toContain("Path=/api/cms");
      expect(nonce.headers.get("set-cookie")).toContain("SameSite=Lax");
      expect(nonce.headers.get("set-cookie")).not.toContain("Secure");
      const nonceCookie = cookieFrom(
        nonce,
        `solution_cms_google_nonce_${nonce.body.flowId}`
      );
      credentialNonces.set("credential-1", nonce.body.nonce);
      // A second tab retains the first cookie and receives its own independent
      // flow cookie. Both tabs now share the same browser cookie header.
      const secondNonce = await request(
        running.baseUrl,
        "/api/cms/google/nonce",
        {
          method: "POST",
          headers: { ...writeHeaders, Cookie: nonceCookie },
          body: "{}",
        }
      );
      expect(secondNonce.status).toBe(200);
      expect(secondNonce.body.flowId).not.toBe(nonce.body.flowId);
      const secondCookie = cookieFrom(
        secondNonce,
        `solution_cms_google_nonce_${secondNonce.body.flowId}`
      );
      const browserCookies = `${nonceCookie}; ${secondCookie}`;
      credentialNonces.set("credential-2", secondNonce.body.nonce);

      const googleLogin = await request(
        running.baseUrl,
        "/api/cms/google/login",
        {
          method: "POST",
          headers: { ...writeHeaders, Cookie: browserCookies },
          body: JSON.stringify({
            credential: "credential-1",
            flowId: nonce.body.flowId,
          }),
        }
      );
      expect(googleLogin.status).toBe(200);
      expect(googleLogin.body.user).toMatchObject({
        username: "owner-test",
        role: "owner",
        mustChangePassword: false,
      });
      expect(googleVerifier).toHaveBeenCalledWith(
        "credential-1",
        nonce.body.nonce,
        "cms-client-id.apps.googleusercontent.com"
      );

      const secondLogin = await request(
        running.baseUrl,
        "/api/cms/google/login",
        {
          method: "POST",
          headers: { ...writeHeaders, Cookie: browserCookies },
          body: JSON.stringify({
            credential: "credential-2",
            flowId: secondNonce.body.flowId,
          }),
        }
      );
      expect(secondLogin.status).toBe(200);
      expect(secondLogin.body.user.username).toBe("owner-test");
      expect(googleVerifier).toHaveBeenCalledWith(
        "credential-2",
        secondNonce.body.nonce,
        "cms-client-id.apps.googleusercontent.com"
      );

      const replay = await request(running.baseUrl, "/api/cms/google/login", {
        method: "POST",
        headers: { ...writeHeaders, Cookie: browserCookies },
        body: JSON.stringify({
          credential: "credential-1",
          flowId: nonce.body.flowId,
        }),
      });
      expect(replay.status).toBe(401);
      expect(replay.headers.get("cache-control")).toBe("no-store");

      const latestUsers = await request(running.baseUrl, "/api/cms/users", {
        headers: { Cookie: ownerCookie },
      });
      const createEditor = await request(running.baseUrl, "/api/cms/users", {
        method: "POST",
        headers: { ...writeHeaders, Cookie: ownerCookie },
        body: JSON.stringify({
          username: "editor-one",
          password: "editor-password-12",
          revision: latestUsers.body.revision,
        }),
      });
      const editorLogin = await request(running.baseUrl, "/api/cms/login", {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          username: "editor-one",
          password: "editor-password-12",
        }),
      });
      const editorInitialCookie = cookieFrom(
        editorLogin,
        "solution_cms_session"
      );
      const editorPassword = await request(
        running.baseUrl,
        "/api/cms/password",
        {
          method: "POST",
          headers: { ...writeHeaders, Cookie: editorInitialCookie },
          body: JSON.stringify({
            currentPassword: "editor-password-12",
            newPassword: "editor-replacement-12",
          }),
        }
      );
      const editorCookie = cookieFrom(editorPassword, "solution_cms_session");
      const editorId = createEditor.body.users.find(
        (user: { username: string }) => user.username === "editor-one"
      ).id;
      const editorDenied = await request(
        running.baseUrl,
        "/api/cms/users/google",
        {
          method: "PUT",
          headers: { ...writeHeaders, Cookie: editorCookie },
          body: JSON.stringify({
            id: editorId,
            email: "editor@gmail.com",
            revision: createEditor.body.revision,
          }),
        }
      );
      expect(editorDenied.status).toBe(403);
    } finally {
      await running.close();
    }
  });
});
