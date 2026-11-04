import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { CmsAuthError } from "./errors";
import {
  CMS_AUTH_MAX_GOOGLE_EMAIL_LENGTH,
  CMS_AUTH_MAX_GOOGLE_SUB_LENGTH,
  type CmsGoogleLoginInput,
} from "./userStore";

export const GOOGLE_JWK_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = [
  "https://accounts.google.com",
  "accounts.google.com",
] as const;

const GOOGLE_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
const GOOGLE_JWKS = createRemoteJWKSet(new URL(GOOGLE_JWK_URL));

export type GoogleIdTokenClaims = CmsGoogleLoginInput;
export type CmsGoogleJwkSet = ReturnType<typeof createRemoteJWKSet>;
export type CmsGoogleTokenVerifier = (
  credential: string,
  expectedNonce: string,
  clientId: string
) => Promise<GoogleIdTokenClaims>;

type GoogleJwtPayload = JWTPayload & {
  email?: unknown;
  email_verified?: unknown;
  nonce?: unknown;
  hd?: unknown;
};

function invalidGoogleToken(): CmsAuthError {
  return new CmsAuthError(401, "Google sign-in was not accepted.");
}

export function getCmsGoogleClientId(
  value = process.env.CMS_GOOGLE_CLIENT_ID
): string | null {
  if (typeof value !== "string") return null;
  const clientId = value.trim();
  if (clientId.length === 0 || clientId.length > 512) return null;
  if (!/^[A-Za-z0-9_.-]+\.apps\.googleusercontent\.com$/.test(clientId)) {
    return null;
  }
  return clientId;
}

export function createGoogleIdTokenVerifier(
  options: {
    jwks?: CmsGoogleJwkSet;
  } = {}
): CmsGoogleTokenVerifier {
  const jwks = options.jwks ?? GOOGLE_JWKS;
  return async (credential, expectedNonce, clientId) => {
    if (
      typeof credential !== "string" ||
      credential.length === 0 ||
      credential.length > 16_384 ||
      typeof expectedNonce !== "string" ||
      expectedNonce.length < 20 ||
      typeof clientId !== "string" ||
      clientId.length === 0
    ) {
      throw invalidGoogleToken();
    }

    let payload: GoogleJwtPayload;
    try {
      const result = await jwtVerify<GoogleJwtPayload>(credential, jwks, {
        algorithms: ["RS256"],
        issuer: [...GOOGLE_ISSUERS],
        audience: clientId,
        requiredClaims: [
          "iss",
          "aud",
          "exp",
          "iat",
          "sub",
          "email",
          "email_verified",
          "nonce",
        ],
      });
      payload = result.payload;
    } catch {
      throw invalidGoogleToken();
    }

    const now = Math.floor(Date.now() / 1000);
    if (
      typeof payload.iat !== "number" ||
      !Number.isSafeInteger(payload.iat) ||
      payload.iat > now + 60 ||
      typeof payload.exp !== "number" ||
      !Number.isSafeInteger(payload.exp) ||
      payload.exp <= now
    ) {
      throw invalidGoogleToken();
    }
    if (payload.nonce !== expectedNonce) throw invalidGoogleToken();
    if (payload.email_verified !== true) throw invalidGoogleToken();
    if (
      typeof payload.sub !== "string" ||
      payload.sub.length === 0 ||
      payload.sub.length > CMS_AUTH_MAX_GOOGLE_SUB_LENGTH
    ) {
      throw invalidGoogleToken();
    }
    if (
      typeof payload.email !== "string" ||
      payload.email.length > CMS_AUTH_MAX_GOOGLE_EMAIL_LENGTH
    ) {
      throw invalidGoogleToken();
    }
    const email = payload.email.trim().toLowerCase();
    if (
      email.length === 0 ||
      email.length > CMS_AUTH_MAX_GOOGLE_EMAIL_LENGTH ||
      !GOOGLE_EMAIL_PATTERN.test(email)
    ) {
      throw invalidGoogleToken();
    }

    let hd: string | undefined;
    if (payload.hd !== undefined) {
      if (
        typeof payload.hd !== "string" ||
        payload.hd.length === 0 ||
        payload.hd.length > 255
      ) {
        throw invalidGoogleToken();
      }
      hd = payload.hd.toLowerCase();
    }

    return {
      sub: payload.sub,
      email,
      emailVerified: true,
      ...(hd === undefined ? {} : { hd }),
      nonce: expectedNonce,
    } as GoogleIdTokenClaims;
  };
}

export const verifyGoogleIdToken = createGoogleIdTokenVerifier();
