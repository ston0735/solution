import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Request } from "express";
import { CmsAuthError } from "./errors";
import { createCmsApp, isTrustedCmsOrigin, requestIp } from "./routes.ts";
import type { CmsAdminUser } from "./auth";
import {
  createCmsStore,
  type CmsBlobClient,
  type CmsBlobGetResult,
} from "./store";
import { createCmsUserStore, getCmsAuthPath } from "./userStore";
import {
  DEFAULT_SITE_CONTENT,
  type SiteContent,
} from "../../shared/siteContent";

const ONE_PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

type Entry = {
  body: Buffer;
  etag: string;
  contentType: string;
};

class MockBlobClient implements CmsBlobClient {
  readonly blobs = new Map<string, Entry>();
  private nextEtag = 1;

  async get(pathname: string): Promise<CmsBlobGetResult | null> {
    const entry = this.blobs.get(pathname);
    if (!entry) return null;
    return {
      statusCode: 200,
      stream: new Response(new Uint8Array(entry.body)).body,
      blob: {
        pathname,
        contentType: entry.contentType,
        etag: entry.etag,
      },
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

const admin: CmsAdminUser = { role: "admin", openId: "test-admin" };

afterEach(() => {
  vi.unstubAllEnvs();
});

function contentWithField(value: string): SiteContent {
  const content = JSON.parse(
    JSON.stringify(DEFAULT_SITE_CONTENT)
  ) as SiteContent;
  content.fields["home.hero.titleLine1"] = value;
  return content;
}

async function startApp(app: ReturnType<typeof createCmsApp>): Promise<{
  baseUrl: string;
  close: () => Promise<void>;
}> {
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

describe("CMS routes", () => {
  it("uses Vercel's trusted forwarding signal but ignores a raw forwarded-for spoof", () => {
    const requestForIp = (
      headers: Record<string, string>,
      remoteAddress: string | undefined,
      ip: string | undefined
    ) =>
      ({
        get: (name: string) => headers[name.toLowerCase()],
        socket: { remoteAddress },
        ip,
      }) as unknown as Request;

    vi.stubEnv("VERCEL", "1");
    expect(
      requestIp(
        requestForIp(
          {
            "x-vercel-forwarded-for": "203.0.113.10",
            "x-forwarded-for": "198.51.100.99",
          },
          "10.0.0.4",
          "10.0.0.5"
        )
      )
    ).toBe("203.0.113.10");

    vi.stubEnv("VERCEL", "0");
    expect(
      requestIp(
        requestForIp(
          { "x-forwarded-for": "198.51.100.99" },
          "10.0.0.4",
          "10.0.0.5"
        )
      )
    ).toBe("10.0.0.4");
  });

  it("allows only the approved production, local, Manus, and project Preview origins", () => {
    expect(isTrustedCmsOrigin("https://solution-wrap.com")).toBe(true);
    expect(isTrustedCmsOrigin("https://www.solution-wrap.com")).toBe(true);
    expect(isTrustedCmsOrigin("http://127.0.0.1:3000")).toBe(true);
    expect(isTrustedCmsOrigin("http://localhost:3000")).toBe(true);
    expect(
      isTrustedCmsOrigin(
        "https://solution-car-wrap-git-feature-cms-ston0735-9216s-projects.vercel.app"
      )
    ).toBe(true);
    expect(
      isTrustedCmsOrigin(
        "https://other-project-ston0735-9216s-projects.vercel.app"
      )
    ).toBe(false);
    expect(
      isTrustedCmsOrigin("https://solution-car-wrap-git-main-other.vercel.app")
    ).toBe(false);
    expect(
      isTrustedCmsOrigin(
        "https://3000-imadol10pq3nhlnc72fa2-50fb4bf2.sg2.manus.computer"
      )
    ).toBe(true);
    expect(isTrustedCmsOrigin("https://user@www.solution-wrap.com")).toBe(
      false
    );
    expect(
      isTrustedCmsOrigin("https://www.solution-wrap.com/unexpected-path")
    ).toBe(false);
  });

  it("denies non-admin requests and requires the write CSRF guard", async () => {
    const blob = new MockBlobClient();
    const app = createCmsApp({
      store: createCmsStore(blob, { configured: true }),
      authenticateAdmin: async () => {
        throw new CmsAuthError(403, "Admin access required.");
      },
    });
    const running = await startApp(app);
    try {
      const adminResponse = await request(running.baseUrl, "/api/cms/admin");
      expect(adminResponse.status).toBe(403);

      const csrfResponse = await request(running.baseUrl, "/api/cms/draft", {
        method: "PUT",
        body: JSON.stringify({ content: DEFAULT_SITE_CONTENT, revision: "0" }),
      });
      expect(csrfResponse.status).toBe(403);
    } finally {
      await running.close();
    }
  });

  it("supports draft, publish, public reads, and preserves the document on a CAS conflict", async () => {
    const blob = new MockBlobClient();
    const authenticateAdmin = vi.fn(async (_req: Request) => admin);
    const app = createCmsApp({
      store: createCmsStore(blob, { configured: true }),
      authenticateAdmin,
      now: () => new Date("2026-11-04T00:00:00.000Z"),
    });
    const running = await startApp(app);
    const writeHeaders = {
      Origin: "https://www.solution-wrap.com",
      "X-Solution-CMS": "1",
    };

    try {
      const initial = await request(running.baseUrl, "/api/cms?path=admin");
      expect(initial.status).toBe(200);
      expect(initial.body.revision).toBe("0");
      expect(initial.body.updatedAt).toBeNull();

      const draft = await request(running.baseUrl, "/api/cms/draft", {
        method: "PUT",
        headers: writeHeaders,
        body: JSON.stringify({
          content: contentWithField("DRAFT"),
          revision: "0",
        }),
      });
      expect(draft.status).toBe(200);
      expect(draft.body.draft.fields["home.hero.titleLine1"]).toBe("DRAFT");
      expect(draft.body.published.fields["home.hero.titleLine1"]).not.toBe(
        "DRAFT"
      );
      expect(draft.body.revision).not.toBe("0");

      const stale = await request(running.baseUrl, "/api/cms/draft", {
        method: "PUT",
        headers: writeHeaders,
        body: JSON.stringify({
          content: contentWithField("STALE"),
          revision: "0",
        }),
      });
      expect(stale.status).toBe(409);

      const afterConflict = await request(running.baseUrl, "/api/cms/admin");
      expect(afterConflict.status).toBe(200);
      expect(afterConflict.body.draft.fields["home.hero.titleLine1"]).toBe(
        "DRAFT"
      );

      const published = await request(
        running.baseUrl,
        "/api/cms?path=publish",
        {
          method: "POST",
          headers: writeHeaders,
          body: JSON.stringify({
            content: contentWithField("PUBLISHED"),
            revision: draft.body.revision,
          }),
        }
      );
      expect(published.status).toBe(200);
      expect(published.body.published.fields["home.hero.titleLine1"]).toBe(
        "PUBLISHED"
      );
      expect(published.body.publishedAt).toBe("2026-11-04T00:00:00.000Z");

      const publicResponse = await request(running.baseUrl, "/api/cms/public");
      expect(publicResponse.status).toBe(200);
      expect(publicResponse.body.content.fields["home.hero.titleLine1"]).toBe(
        "PUBLISHED"
      );
      expect(publicResponse.body.revision).toBe(published.body.revision);
      expect(authenticateAdmin).toHaveBeenCalled();
    } finally {
      await running.close();
    }
  });

  it("validates image MIME/signatures, sanitizes uploads, and only proxies safe media paths", async () => {
    const blob = new MockBlobClient();
    const app = createCmsApp({
      store: createCmsStore(blob, { configured: true }),
      authenticateAdmin: async () => admin,
    });
    const running = await startApp(app);
    const writeHeaders = {
      Origin: "http://127.0.0.1:3000",
      "X-Solution-CMS": "1",
    };

    try {
      const mismatch = await request(running.baseUrl, "/api/cms/upload", {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          filename: "photo.jpg",
          dataUrl: `data:image/jpeg;base64,${ONE_PIXEL_PNG}`,
        }),
      });
      expect(mismatch.status).toBe(400);

      const oversized = Buffer.alloc(3 * 1024 * 1024 + 1, 0);
      oversized[0] = 0x89;
      oversized[1] = 0x50;
      oversized[2] = 0x4e;
      oversized[3] = 0x47;
      const tooLarge = await request(running.baseUrl, "/api/cms/upload", {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          filename: "large.png",
          dataUrl: `data:image/png;base64,${oversized.toString("base64")}`,
        }),
      });
      expect(tooLarge.status).toBe(400);

      const upload = await request(running.baseUrl, "/api/cms/upload", {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          filename: "photo.png",
          dataUrl: `data:image/png;base64,${ONE_PIXEL_PNG}`,
        }),
      });
      expect(upload.status).toBe(200);
      expect(upload.body.filename).toBe("photo.png");
      expect(upload.body.url).toMatch(/^\/api\/cms\/media\?key=cms%2Fmedia%2F/);

      const media = await request(running.baseUrl, upload.body.url);
      expect(media.status).toBe(200);
      expect(media.headers.get("content-type")).toContain("image/webp");
      expect(media.body).toBeNull();

      const unsafe = await request(
        running.baseUrl,
        "/api/cms/media?key=cms%2Fsite.json"
      );
      expect(unsafe.status).toBe(404);

      const malformed = await request(
        running.baseUrl,
        "/api/cms/media?key=cms%2Fmedia%2Fnot-safe.webp"
      );
      expect(malformed.status).toBe(404);
    } finally {
      await running.close();
    }
  });

  it("implements local login/reset, cookie policy, CSRF, role gates, and owner user management", async () => {
    vi.stubEnv("CMS_BOOTSTRAP_USERNAME", "owner-test");
    vi.stubEnv("CMS_BOOTSTRAP_PASSWORD", "weak-start");
    vi.stubEnv("VERCEL_ENV", "development");
    const blob = new MockBlobClient();
    const app = createCmsApp({
      store: createCmsStore(blob, { configured: true }),
      userStore: createCmsUserStore(blob, { configured: true }),
    });
    const running = await startApp(app);
    const writeHeaders = {
      Origin: "http://127.0.0.1:3000",
      "X-Solution-CMS": "1",
    };
    const authPath = getCmsAuthPath("development");

    try {
      const status = await request(running.baseUrl, "/api/cms/status");
      expect(status.status).toBe(200);
      expect(status.headers.get("cache-control")).toBe("no-store");
      expect(blob.blobs.has(authPath)).toBe(false);

      const csrfLogin = await request(running.baseUrl, "/api/cms/login", {
        method: "POST",
        body: JSON.stringify({
          username: "owner-test",
          password: "weak-start",
        }),
      });
      expect(csrfLogin.status).toBe(403);
      expect(blob.blobs.has(authPath)).toBe(false);

      const login = await request(running.baseUrl, "/api/cms/login", {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          username: "owner-test",
          password: "weak-start",
        }),
      });
      expect(login.status).toBe(200);
      expect(login.headers.get("cache-control")).toBe("no-store");
      expect(login.headers.get("set-cookie")).toContain("HttpOnly");
      expect(login.headers.get("set-cookie")).toContain("SameSite=Lax");
      expect(login.headers.get("set-cookie")).not.toContain("Secure");
      const ownerCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
      expect(ownerCookie).toBeTruthy();
      expect(login.body.user).toMatchObject({
        username: "owner-test",
        role: "owner",
        mustChangePassword: true,
      });

      const session = await request(running.baseUrl, "/api/cms/session", {
        headers: { Cookie: ownerCookie ?? "" },
      });
      expect(session.status).toBe(200);
      expect(session.body.user.mustChangePassword).toBe(true);
      expect(session.headers.get("cache-control")).toBe("no-store");

      const gatedAdmin = await request(running.baseUrl, "/api/cms/admin", {
        headers: { Cookie: ownerCookie ?? "" },
      });
      expect(gatedAdmin.status).toBe(403);

      const password = await request(running.baseUrl, "/api/cms/password", {
        method: "POST",
        headers: { ...writeHeaders, Cookie: ownerCookie ?? "" },
        body: JSON.stringify({
          currentPassword: "weak-start",
          newPassword: "replacement-password-12",
        }),
      });
      expect(password.status).toBe(200);
      expect(password.body.user.mustChangePassword).toBe(false);
      const changedOwnerCookie = password.headers
        .get("set-cookie")
        ?.split(";", 1)[0];
      expect(changedOwnerCookie).toBeTruthy();

      const adminAfterReset = await request(running.baseUrl, "/api/cms/admin", {
        headers: { Cookie: changedOwnerCookie ?? "" },
      });
      expect(adminAfterReset.status).toBe(200);
      expect(adminAfterReset.headers.get("cache-control")).toBe("no-store");

      const ownerUsers = await request(running.baseUrl, "/api/cms/users", {
        headers: { Cookie: changedOwnerCookie ?? "" },
      });
      expect(ownerUsers.status).toBe(200);
      expect(ownerUsers.headers.get("cache-control")).toBe("no-store");
      const owner = ownerUsers.body.users.find(
        (user: { username: string }) => user.username === "owner-test"
      );
      const createEditor = await request(running.baseUrl, "/api/cms/users", {
        method: "POST",
        headers: { ...writeHeaders, Cookie: changedOwnerCookie ?? "" },
        body: JSON.stringify({
          username: "editor-one",
          password: "editor-password-12",
          revision: ownerUsers.body.revision,
        }),
      });
      expect(createEditor.status).toBe(200);
      expect(JSON.stringify(createEditor.body)).not.toContain(
        "editor-password-12"
      );
      expect(owner).toBeTruthy();

      const editorLogin = await request(running.baseUrl, "/api/cms/login", {
        method: "POST",
        headers: writeHeaders,
        body: JSON.stringify({
          username: "editor-one",
          password: "editor-password-12",
        }),
      });
      const editorInitialCookie = editorLogin.headers
        .get("set-cookie")
        ?.split(";", 1)[0];
      expect(editorLogin.body.user).toMatchObject({
        role: "editor",
        mustChangePassword: true,
      });
      const editorGatedUsers = await request(
        running.baseUrl,
        "/api/cms/users",
        {
          headers: { Cookie: editorInitialCookie ?? "" },
        }
      );
      expect(editorGatedUsers.status).toBe(403);

      const editorPassword = await request(
        running.baseUrl,
        "/api/cms/password",
        {
          method: "POST",
          headers: { ...writeHeaders, Cookie: editorInitialCookie ?? "" },
          body: JSON.stringify({
            currentPassword: "editor-password-12",
            newPassword: "editor-replacement-12",
          }),
        }
      );
      const editorCookie = editorPassword.headers
        .get("set-cookie")
        ?.split(";", 1)[0];
      const editorUsers = await request(running.baseUrl, "/api/cms/users", {
        headers: { Cookie: editorCookie ?? "" },
      });
      expect(editorUsers.status).toBe(403);
      const editorAdmin = await request(running.baseUrl, "/api/cms/admin", {
        headers: { Cookie: editorCookie ?? "" },
      });
      expect(editorAdmin.status).toBe(200);
      const ownerUsersAfterEditorLogin = await request(
        running.baseUrl,
        "/api/cms/users",
        { headers: { Cookie: changedOwnerCookie ?? "" } }
      );
      expect(ownerUsersAfterEditorLogin.status).toBe(200);

      const ownerDisable = await request(running.baseUrl, "/api/cms/users", {
        method: "PUT",
        headers: { ...writeHeaders, Cookie: changedOwnerCookie ?? "" },
        body: JSON.stringify({
          id: owner.id,
          enabled: false,
          revision: ownerUsersAfterEditorLogin.body.revision,
        }),
      });
      expect(ownerDisable.status).toBe(403);
    } finally {
      await running.close();
    }
  });
});
