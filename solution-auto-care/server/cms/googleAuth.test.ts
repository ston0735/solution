import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createGoogleIdTokenVerifier,
  getCmsGoogleClientId,
  type CmsGoogleJwkSet,
} from "./googleAuth";

const CLIENT_ID = "cms-client-id.apps.googleusercontent.com";
const NONCE = "nonce-for-google-test-123456789";
const ISSUER = "https://accounts.google.com";

let privateKey: CryptoKey;
let verifier: ReturnType<typeof createGoogleIdTokenVerifier>;

async function makeToken(
  overrides: Record<string, unknown> = {},
  key = privateKey
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiration =
    typeof overrides.exp === "number" ? overrides.exp : now + 3600;
  const payload = {
    email: "owner@gmail.com",
    email_verified: true,
    nonce: NONCE,
    ...overrides,
  };
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", kid: "google-test" })
    .setIssuer(ISSUER)
    .setAudience(CLIENT_ID)
    .setSubject("google-subject-1")
    .setIssuedAt(now)
    .setExpirationTime(expiration)
    .sign(key);
}

beforeAll(async () => {
  const generated = await generateKeyPair("RS256");
  privateKey = generated.privateKey;
  const jwk = await exportJWK(generated.publicKey);
  const jwks = createLocalJWKSet({
    keys: [{ ...jwk, kid: "google-test", alg: "RS256", use: "sig" }],
  });
  verifier = createGoogleIdTokenVerifier({
    jwks: jwks as unknown as CmsGoogleJwkSet,
  });
});

describe("Google CMS ID-token verification", () => {
  it("treats only valid Web OAuth Client IDs as configured", () => {
    expect(getCmsGoogleClientId(CLIENT_ID)).toBe(CLIENT_ID);
    expect(getCmsGoogleClientId(` ${CLIENT_ID} `)).toBe(CLIENT_ID);
    expect(getCmsGoogleClientId("owner@gmail.com")).toBeNull();
    expect(getCmsGoogleClientId("incorrect-id")).toBeNull();
    expect(getCmsGoogleClientId("")).toBeNull();
  });

  it("accepts a verified RS256 token with the expected audience, issuer, and nonce", async () => {
    await expect(
      verifier(await makeToken(), NONCE, CLIENT_ID)
    ).resolves.toMatchObject({
      sub: "google-subject-1",
      email: "owner@gmail.com",
      emailVerified: true,
      nonce: NONCE,
    });
  });

  it.each<[string, Record<string, unknown>]>([
    ["invalid signature", { key: "other" }],
    ["invalid audience", { aud: "different-client" }],
    ["invalid issuer", { iss: "https://accounts.example.test" }],
    ["expired", { exp: 1 }],
    ["unverified email", { email_verified: false }],
    ["nonce mismatch", { nonce: "different-nonce" }],
  ])("rejects %s", async (_label, change) => {
    let token: string;
    if (change.key === "other") {
      const other = await generateKeyPair("RS256");
      token = await makeToken({}, other.privateKey);
    } else if (change.aud) {
      const now = Math.floor(Date.now() / 1000);
      token = await new SignJWT({
        email: "owner@gmail.com",
        email_verified: true,
        nonce: NONCE,
      })
        .setProtectedHeader({ alg: "RS256", kid: "google-test" })
        .setIssuer(ISSUER)
        .setAudience(String(change.aud))
        .setSubject("google-subject-1")
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);
    } else if (change.iss) {
      const now = Math.floor(Date.now() / 1000);
      token = await new SignJWT({
        email: "owner@gmail.com",
        email_verified: true,
        nonce: NONCE,
      })
        .setProtectedHeader({ alg: "RS256", kid: "google-test" })
        .setIssuer(String(change.iss))
        .setAudience(CLIENT_ID)
        .setSubject("google-subject-1")
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(privateKey);
    } else if (change.exp === 1) {
      token = await makeToken({ exp: 1 });
    } else {
      token = await makeToken(change);
    }

    await expect(verifier(token, NONCE, CLIENT_ID)).rejects.toMatchObject({
      status: 401,
    });
  });
});
