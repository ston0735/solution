import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCmsUserStore,
  getCmsAuthPath,
  getCmsBootstrapLimitPath,
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
        status: 412,
        name: "BlobPreconditionFailedError",
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

class RetryOnceBlobClient implements CmsAuthBlobClient {
  private readonly inner: MockBlobClient;
  private shouldConflict = true;

  constructor(inner: MockBlobClient) {
    this.inner = inner;
  }

  async get(pathname: string, options: { access: "private"; useCache: false }) {
    void options;
    return this.inner.get(pathname);
  }

  async put(
    pathname: string,
    body: unknown,
    options: {
      access: "private";
      allowOverwrite: boolean;
      contentType?: string;
      ifMatch?: string;
    }
  ): Promise<void> {
    if (pathname.endsWith("-bootstrap-limit.json") && this.shouldConflict) {
      this.shouldConflict = false;
      throw Object.assign(new Error("already exists"), { status: 409 });
    }
    await this.inner.put(pathname, body, options);
  }
}

function configureBootstrap() {
  vi.stubEnv("CMS_BOOTSTRAP_USERNAME", "owner-test");
  vi.stubEnv("CMS_BOOTSTRAP_PASSWORD", "weak-start");
  vi.stubEnv("VERCEL_ENV", "development");
}

async function seededStore() {
  configureBootstrap();
  const blob = new MockBlobClient();
  const store = createCmsUserStore(blob, { configured: true });
  const login = await store.login("owner-test", "weak-start", "seed-ip");
  return { blob, store, login };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("CMS auth document store", () => {
  it("does not reset an existing document when bootstrap environment values change", async () => {
    const { blob, store, login } = await seededStore();
    vi.stubEnv("CMS_BOOTSTRAP_PASSWORD", "different-env-value");
    const oldPassword = await store.login(
      "owner-test",
      "weak-start",
      "existing-ip"
    );
    expect(oldPassword.principal.id).toBe(login.principal.id);
    await expect(
      store.login("owner-test", "different-env-value", "new-ip")
    ).rejects.toMatchObject({ status: 401 });
    expect(blob.blobs.has(getCmsAuthPath("development"))).toBe(true);
  });

  it("requires a first-login reset, rotates the session, and returns no password fields", async () => {
    const { store, login } = await seededStore();
    const changed = await store.changePassword(
      login.sessionToken,
      "weak-start",
      "replacement-password-12"
    );
    expect(changed.sessionToken).not.toBe(login.sessionToken);
    expect(changed.principal.mustChangePassword).toBe(false);
    await expect(
      store.authenticateSession(login.sessionToken)
    ).rejects.toMatchObject({
      status: 401,
    });

    const users = await store.listUsers();
    expect(users.users).toHaveLength(1);
    expect(users.users[0]).toMatchObject({
      username: "owner-test",
      role: "owner",
      mustChangePassword: false,
    });
    expect(users.users[0]).not.toHaveProperty("passwordHash");
    expect(users.users[0]).not.toHaveProperty("failedAttempts");
  });

  it("uses durable five-failure lockout and keeps wrong initial guesses out of the account document", async () => {
    configureBootstrap();
    const blob = new MockBlobClient();
    const store = createCmsUserStore(blob, { configured: true });
    await store.login("owner-test", "weak-start", "seed-lockout-ip");
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        store.login("owner-test", "wrong-password", "lockout-ip")
      ).rejects.toMatchObject({ status: 401 });
    }
    await expect(
      store.login("owner-test", "weak-start", "different-ip")
    ).rejects.toMatchObject({ status: 401 });

    const stored = await store.readSnapshot();
    expect(stored.document?.accounts[0].failedAttempts).toBe(5);
    expect(stored.document?.accounts[0].lockedUntil).toEqual(
      expect.any(String)
    );

    const emptyBlob = new MockBlobClient();
    const emptyStore = createCmsUserStore(emptyBlob, { configured: true });
    await expect(
      emptyStore.login("unknown-user", "wrong-password", "empty-ip")
    ).rejects.toMatchObject({ status: 401 });
    expect(emptyBlob.blobs.has(getCmsAuthPath("development"))).toBe(false);
    expect(
      emptyBlob.blobs.has(
        getCmsBootstrapLimitPath(getCmsAuthPath("development"))
      )
    ).toBe(true);
  });

  it("enforces one shared pre-bootstrap budget across instances and resets it after expiry", async () => {
    configureBootstrap();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-04T00:00:00.000Z"));
    const blob = new MockBlobClient();
    const stores = [
      createCmsUserStore(blob, { configured: true }),
      createCmsUserStore(blob, { configured: true }),
      createCmsUserStore(blob, { configured: true }),
    ];

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        stores[attempt % stores.length].login(
          "owner-test",
          `wrong-${attempt}`,
          `spoofed-ip-${attempt}`
        )
      ).rejects.toMatchObject({ status: 401 });
    }

    const authPath = getCmsAuthPath("development");
    const limiterPath = getCmsBootstrapLimitPath(authPath);
    expect(blob.blobs.has(authPath)).toBe(false);
    expect(blob.blobs.has(limiterPath)).toBe(true);
    await expect(
      stores[0].login("owner-test", "weak-start", "a-different-ip")
    ).rejects.toMatchObject({ status: 401 });
    expect(blob.blobs.has(authPath)).toBe(false);

    vi.setSystemTime(new Date("2026-11-04T00:15:01.000Z"));
    await expect(
      stores[1].login("owner-test", "weak-start", "a-different-ip")
    ).resolves.toBeDefined();
    expect(blob.blobs.has(authPath)).toBe(true);
  });

  it("retries a bootstrap limiter CAS conflict without overwriting another reservation", async () => {
    configureBootstrap();
    const blob = new MockBlobClient();
    const retrying = new RetryOnceBlobClient(blob);
    const first = createCmsUserStore(retrying, { configured: true });
    const second = createCmsUserStore(blob, { configured: true });

    await expect(
      first.login("owner-test", "wrong-password", "first-ip")
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      second.login("owner-test", "wrong-password", "second-ip")
    ).rejects.toMatchObject({ status: 401 });

    const limiterPath = getCmsBootstrapLimitPath(getCmsAuthPath("development"));
    const limiter = JSON.parse(
      blob.blobs.get(limiterPath)?.body.toString("utf8") ?? "{}"
    ) as { attempts?: number };
    expect(limiter.attempts).toBe(2);
    expect(blob.blobs.has(getCmsAuthPath("development"))).toBe(false);
  });

  it("enforces revision CAS, keeps the owner protected, and invalidates removed editor sessions", async () => {
    const { store, login } = await seededStore();
    const changed = await store.changePassword(
      login.sessionToken,
      "weak-start",
      "replacement-password-12"
    );
    const current = await store.listUsers();
    const editor = await store.createEditor({
      username: "editor-one",
      password: "editor-password-12",
      name: "Editor One",
      revision: current.revision,
    });
    const editorRecord = editor.users.find(
      user => user.username === "editor-one"
    );
    if (!editorRecord) throw new Error("editor was not created");
    const editorLogin = await store.login(
      "editor-one",
      "editor-password-12",
      "editor-ip"
    );
    const afterEditorLogin = await store.listUsers();

    await expect(
      store.createEditor({
        username: "stale-user",
        password: "stale-password-12",
        revision: current.revision,
      })
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      store.setEditorEnabled({
        id: changed.principal.id,
        enabled: false,
        revision: afterEditorLogin.revision,
      })
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      store.removeEditor({
        id: changed.principal.id,
        revision: afterEditorLogin.revision,
      })
    ).rejects.toMatchObject({ status: 403 });

    const removed = await store.removeEditor({
      id: editorRecord.id,
      revision: afterEditorLogin.revision,
    });
    await expect(
      store.authenticateSession(editorLogin.sessionToken)
    ).rejects.toMatchObject({
      status: 401,
    });
    await expect(
      store.createEditor({
        username: "editor-one",
        password: "another-password-12",
        revision: removed.revision,
      })
    ).rejects.toMatchObject({ status: 409 });
  });

  it("maps storage races to a safe conflict without exposing provider details", async () => {
    configureBootstrap();
    const blob = new MockBlobClient();
    const store = createCmsUserStore(blob, { configured: true });
    await expect(
      store.login("owner-test", "weak-start", "cas-ip")
    ).resolves.toBeDefined();
    const snapshot = await store.readSnapshot();
    if (!snapshot.document) throw new Error("document was not seeded");
    const competing = createCmsUserStore(blob, { configured: true });
    const first = store.createEditor({
      username: "editor-cas",
      password: "cas-password-12",
      revision: snapshot.document.revision,
    });
    const second = competing.createEditor({
      username: "editor-cas-two",
      password: "cas-password-12",
      revision: snapshot.document.revision,
    });
    const results = await Promise.allSettled([first, second]);
    expect(
      results.filter(result => result.status === "fulfilled")
    ).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(
      1
    );
    const rejected = results.find(result => result.status === "rejected");
    expect(rejected).toMatchObject({
      reason: expect.objectContaining({ status: 409 }),
    });
    expect(JSON.stringify(rejected)).not.toContain("cas-password-12");
  });
});
