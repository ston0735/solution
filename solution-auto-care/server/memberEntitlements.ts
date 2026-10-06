import type { Request } from "express";
import type { User } from "../drizzle/schema";

const MEMBER_AUTH_BRIDGE_ORIGIN = "https://solutionauth-zcgxwa4c.manus.space";
const BRIDGE_SESSION_COOKIE = "webdev_app_session";
const UNLIMITED_MEMBER_EMAILS = new Set(["jim700510@gmail.com"]);

function normalizeEmail(email: string | null | undefined) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isUnlimitedMemberEmail(email: string | null | undefined) {
  return UNLIMITED_MEMBER_EMAILS.has(normalizeEmail(email));
}

function readCookie(request: Request, name: string) {
  const cookieHeader = request.headers.cookie ?? "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function readBridgeIdentity(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as {
    result?: { data?: { json?: unknown } | unknown };
  };
  const data = root.result?.data;
  if (!data || typeof data !== "object") return null;
  if ("json" in data) return (data as { json?: unknown }).json ?? null;
  return data;
}

/**
 * The public image service is deployed separately from the member bridge.
 * Resolve the bridge's HttpOnly session server-to-server so an email cannot be
 * spoofed in the image-generation request body or query string.
 */
export async function hasUnlimitedMemberAccess(
  request: Request,
  user: User | null
) {
  if (isUnlimitedMemberEmail(user?.email)) return true;

  const session = readCookie(request, BRIDGE_SESSION_COOKIE);
  if (!session) return false;

  try {
    const response = await fetch(
      `${MEMBER_AUTH_BRIDGE_ORIGIN}/api/trpc/auth.me`,
      {
        headers: {
          Accept: "application/json",
          Cookie: `${BRIDGE_SESSION_COOKIE}=${encodeURIComponent(session)}`,
        },
        signal: AbortSignal.timeout(2_500),
      }
    );
    if (!response.ok) return false;
    const payload = (await response.json()) as unknown;
    const identity = readBridgeIdentity(payload);
    if (!identity || typeof identity !== "object") return false;
    const email = (identity as { email?: unknown }).email;
    return typeof email === "string" && isUnlimitedMemberEmail(email);
  } catch {
    // A bridge/network failure must fail closed and retain the normal limit.
    return false;
  }
}
