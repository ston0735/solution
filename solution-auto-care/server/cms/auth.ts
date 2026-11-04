import type { Request, Response } from "express";
import { parse as parseCookie } from "cookie";
import { CmsAuthError } from "./errors";
import {
  CMS_AUTH_COOKIE,
  CMS_AUTH_SESSION_TTL_MS,
  createCmsUserStore,
  type CmsAuthRole,
  type CmsPrincipal,
  type CmsUserStore,
} from "./userStore";

export const CMS_SESSION_COOKIE = CMS_AUTH_COOKIE;

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
