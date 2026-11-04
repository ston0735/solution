import type { Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { CmsAuthError, CmsConflictError } from "./errors";
import {
  CMS_AUTH_COOKIE,
  CMS_AUTH_SESSION_TTL_MS,
  createCmsUserStore,
  type CmsAuthRole,
  type CmsPrincipal,
  type CmsUserStore,
} from "./userStore";

export const CMS_SESSION_COOKIE = CMS_AUTH_COOKIE;
export const CMS_GOOGLE_NONCE_COOKIE = "solution_cms_google_nonce";
export const CMS_GOOGLE_NONCE_COOKIE_TTL_SECONDS = 5 * 60;
const CMS_GOOGLE_FLOW_LIMIT = 10;

function googleNonceCookieName(flowId: string): string | null {
  return /^[a-f0-9]{32}$/.test(flowId)
    ? `${CMS_GOOGLE_NONCE_COOKIE}_${flowId}`
    : null;
}

export function assertCmsGoogleFlowCapacity(req: Request): void {
  const cookies = parseCookie(getHeader(req, "cookie") ?? "");
  const activeFlowCount = Object.keys(cookies).filter(name =>
    name.startsWith(`${CMS_GOOGLE_NONCE_COOKIE}_`)
  ).length;
  if (activeFlowCount >= CMS_GOOGLE_FLOW_LIMIT) {
    throw new CmsConflictError("Too many active Google sign-in flows.");
  }
}

// This compatibility shape keeps existing registerCmsRoutes test seams usable:
// legacy injected admins only need role:"admin", while the default local
// authenticator always supplies cmsRole, id, username, and mustChangePassword.
export type CmsAdminUser = {
  role: "admin";
  cmsRole?: CmsAuthRole;
  id?: string;
  username?: string;
  name?: string;
  mustChangePassword?: boolean;
  openId?: string;
  [key: string]: unknown;
};

export type CmsAuthenticator = (req: Request) => Promise<CmsAdminUser>;

function asCmsAdminUser(principal: CmsPrincipal): CmsAdminUser {
  return principal;
}

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

export function getCmsSessionToken(req: Request): string | null {
  const header = getHeader(req, "cookie");
  if (!header) return null;
  const cookies = parseCookie(header);
  const token = cookies[CMS_SESSION_COOKIE];
  return token && token.length <= 200 ? token : null;
}

function cookieSecurityForOrigin(req: Request): {
  secure: boolean;
  sameSite: "none" | "lax";
} {
  const origin = getHeader(req, "origin");
  if (!origin) {
    throw new CmsAuthError(403, "CMS write protection failed.");
  }
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new CmsAuthError(403, "CMS write protection failed.");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new CmsAuthError(403, "CMS write protection failed.");
  }
  return parsed.protocol === "https:"
    ? { secure: true, sameSite: "none" }
    : { secure: false, sameSite: "lax" };
}

function serializeCmsCookie(
  token: string,
  security: { secure: boolean; sameSite: "none" | "lax" },
  maxAge: number
): string {
  return [
    `${CMS_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${security.sameSite === "none" ? "None" : "Lax"}`,
    ...(security.secure ? ["Secure"] : []),
  ].join("; ");
}

function serializeGoogleNonceCookie(
  nonce: string,
  flowId: string,
  security: { secure: boolean; sameSite: "none" | "lax" },
  maxAge: number
): string {
  const cookieName = googleNonceCookieName(flowId);
  if (!cookieName) throw new CmsAuthError(403, "Invalid Google sign-in flow.");
  return [
    `${cookieName}=${encodeURIComponent(nonce)}`,
    `Max-Age=${maxAge}`,
    "Path=/api/cms",
    "HttpOnly",
    `SameSite=${security.sameSite === "none" ? "None" : "Lax"}`,
    ...(security.secure ? ["Secure"] : []),
  ].join("; ");
}

export function getCmsGoogleNonce(req: Request, flowId: string): string | null {
  const cookieName = googleNonceCookieName(flowId);
  if (!cookieName) return null;
  const header = getHeader(req, "cookie");
  if (!header) return null;
  const cookies = parseCookie(header);
  const nonce = cookies[cookieName];
  return nonce && nonce.length >= 20 && nonce.length <= 200 ? nonce : null;
}

export function setCmsGoogleNonceCookie(
  res: Response,
  req: Request,
  nonce: string,
  flowId: string
): void {
  const security = cookieSecurityForOrigin(req);
  res.append(
    "Set-Cookie",
    serializeGoogleNonceCookie(
      nonce,
      flowId,
      security,
      CMS_GOOGLE_NONCE_COOKIE_TTL_SECONDS
    )
  );
}

export function clearCmsGoogleNonceCookie(
  res: Response,
  req: Request,
  flowId: string
): void {
  const security = cookieSecurityForOrigin(req);
  res.append("Set-Cookie", serializeGoogleNonceCookie("", flowId, security, 0));
}

export function setCmsSessionCookie(
  res: Response,
  req: Request,
  token: string
): void {
  const security = cookieSecurityForOrigin(req);
  res.append(
    "Set-Cookie",
    serializeCmsCookie(
      token,
      security,
      Math.floor(CMS_AUTH_SESSION_TTL_MS / 1000)
    )
  );
}

export function clearCmsSessionCookie(res: Response, req: Request): void {
  const security = cookieSecurityForOrigin(req);
  res.append("Set-Cookie", serializeCmsCookie("", security, 0));
}

export async function authenticateCmsAdmin(
  req: Request,
  userStore: CmsUserStore = createCmsUserStore()
): Promise<CmsAdminUser> {
  const token = getCmsSessionToken(req);
  if (!token) throw new CmsAuthError(401, "Authentication required.");
  try {
    return asCmsAdminUser(await userStore.authenticateSession(token));
  } catch (error) {
    if (error instanceof CmsAuthError) throw error;
    throw new CmsAuthError(503, "Authentication service unavailable.");
  }
}
