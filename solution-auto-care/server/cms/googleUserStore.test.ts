import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCmsUserStore,
  getCmsAuthPath,
  type CmsAuthBlobClient,
} from "./userStore";
import type { CmsBlobGetResult } from "./store";

type Entry = { body: Buffer; etag: string; contentType: string };

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

function configureBootstrap() {
  vi.stubEnv("CMS_BOOTSTRAP_USERNAME", "owner-test");
  vi.stubEnv("CMS_BOOTSTRAP_PASSWORD", "weak-start");
  vi.stubEnv("VERCEL_ENV", "development");
}

async function initializedStore() {
  configureBootstrap();
  const blob = new MockBlobClient();
  const store = createCmsUserStore(blob, { configured: true });
  const initial = await store.login("owner-test", "weak-start", "google-ip");
  return { blob, store, initial };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("CMS Google identity store", () => {
  it("does not bootstrap from Google and preserves the mandatory password gate", async () => {
    configureBootstrap();
    const blob = new MockBlobClient();
    const store = createCmsUserStore(blob, { configured: true });
    await expect(
      store.loginWithGoogle({
        nonce: "nonce-that-must-not-bootstrap-123",
        sub: "unknown-sub",
        email: "owner@gmail.com",
        emailVerified: true,
      })
    ).rejects.toMatchObject({ status: 401 });
    expect(blob.blobs.has(getCmsAuthPath("development"))).toBe(false);

    const seeded = await initializedStore();
    const users = await seeded.store.listUsers();
    const ownerId = seeded.initial.principal.id;
    const authorized = await seeded.store.setGoogleEmail({
      id: ownerId,
      email: "owner@gmail.com",
      revision: users.revision,
    });
    expect(authorized.users[0]).toMatchObject({
      googleEmail: "owner@gmail.com",
      googleLinked: false,
    });
    expect(
      await seeded.store.authenticateSession(seeded.initial.sessionToken)
    ).toMatchObject({ username: "owner-test" });

    const nonce = await seeded.store.issueGoogleNonce();
    const googleLogin = await seeded.store.loginWithGoogle({
      nonce,
      sub: "owner-sub-1",
      email: "owner@gmail.com",
      emailVerified: true,
    });
    expect(googleLogin.principal.mustChangePassword).toBe(true);
    expect((await seeded.store.listUsers()).users[0]).toMatchObject({
      googleEmail: "owner@gmail.com",
      googleLinked: true,
    });
  });

  it("pins the first subject, rejects replay and subject substitution, and supports subject continuity", async () => {
    const { store } = await initializedStore();
    const current = await store.listUsers();
    await store.setGoogleEmail({
      id: current.users[0].id,
      email: "owner@gmail.com",
      revision: current.revision,
    });

    const unknownNonce = await store.issueGoogleNonce();
    await expect(
      store.loginWithGoogle({
        nonce: unknownNonce,
        sub: "unknown-sub",
        email: "unknown@gmail.com",
        emailVerified: true,
      })
    ).rejects.toMatchObject({ status: 401 });

    const nonce = await store.issueGoogleNonce();
    await expect(
      store.loginWithGoogle({
        nonce,
        sub: "owner-sub-1",
        email: "owner@not-authoritative.example",
        emailVerified: true,
        hd: "not-authoritative.example",
      })
    ).rejects.toMatchObject({ status: 401 });

    const first = await store.loginWithGoogle({
      nonce: await store.issueGoogleNonce(),
      sub: "owner-sub-1",
      email: "owner@gmail.com",
      emailVerified: true,
    });
    await expect(
      store.loginWithGoogle({
        nonce: await store.issueGoogleNonce(),
        sub: "owner-sub-2",
        email: "owner@gmail.com",
        emailVerified: true,
      })
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      store.loginWithGoogle({
        nonce: await store.issueGoogleNonce(),
        sub: "owner-sub-1",
        email: "changed-email@gmail.com",
        emailVerified: true,
      })
    ).resolves.toMatchObject({ principal: { id: first.principal.id } });

    const after = await store.listUsers();
    expect(after.users[0].googleLinked).toBe(true);
  });

  it("prevents duplicate authorization and revokes Google sessions when the email changes", async () => {
    const { store } = await initializedStore();
    const ownerUsers = await store.listUsers();
    const ownerId = ownerUsers.users[0].id;
    await store.setGoogleEmail({
      id: ownerId,
      email: "owner@gmail.com",
      revision: ownerUsers.revision,
    });
    const editor = await store.createEditor({
      username: "editor-google",
      password: "editor-password-12",
      revision: (await store.listUsers()).revision,
    });
    const editorId = editor.users.find(
      user => user.username === "editor-google"
    )?.id;
    if (!editorId) throw new Error("editor was not created");
    await expect(
      store.setGoogleEmail({
        id: editorId,
        email: "OWNER@GMAIL.COM",
        revision: editor.revision,
      })
    ).rejects.toMatchObject({ status: 409 });

    const googleSession = await store.loginWithGoogle({
      nonce: await store.issueGoogleNonce(),
      sub: "owner-sub-1",
      email: "owner@gmail.com",
      emailVerified: true,
    });
    const changed = await store.setGoogleEmail({
      id: ownerId,
      email: "new-owner@gmail.com",
      revision: (await store.listUsers()).revision,
    });
    expect(changed.users.find(user => user.id === ownerId)).toMatchObject({
      googleEmail: "new-owner@gmail.com",
      googleLinked: false,
    });
    await expect(
      store.authenticateSession(googleSession.sessionToken)
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      store.loginWithGoogle({
        nonce: await store.issueGoogleNonce(),
        sub: "owner-sub-1",
        email: "owner@gmail.com",
        emailVerified: true,
      })
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      store.loginWithGoogle({
        nonce: await store.issueGoogleNonce(),
        sub: "owner-sub-2",
        email: "new-owner@gmail.com",
        emailVerified: true,
      })
    ).resolves.toMatchObject({ principal: { id: ownerId } });
  });
});
