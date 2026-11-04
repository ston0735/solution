import type { Request } from "express";
import { CmsAuthError } from "./errors";

export const CMS_AUTH_ME_URL =
  "https://solutionauth-zcgxwa4c.manus.space/api/trpc/auth.me?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%7D%7D";

const REMOTE_AUTH_TIMEOUT_MS = 5_000;

type RemoteUser = {
  role: string;
  [key: string]: unknown;
};

export type CmsAdminUser = RemoteUser & { role: "admin" };
export type CmsAuthenticator = (req: Request) => Promise<CmsAdminUser>;
export type CmsFetch = typeof fetch;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unwrapTrpcUser(payload: unknown): unknown {
  const batchItem = Array.isArray(payload) ? payload[0] : payload;
  if (!isRecord(batchItem)) return undefined;

  const result = batchItem.result;
  if (!isRecord(result)) return undefined;

  const data = result.data;
  if (isRecord(data) && Object.prototype.hasOwnProperty.call(data, "json")) {
    return data.json;
  }
  return data;
}

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" ? value : undefined;
}

function buildForwardHeaders(req: Request): Headers {
  const headers = new Headers({ Accept: "application/json" });
  const cookie = getHeader(req, "cookie");
  const manusCookie = getHeader(req, "x-manus-cookie");
  const authorization = getHeader(req, "authorization");

  if (cookie) headers.set("Cookie", cookie);
  if (manusCookie) {
    headers.set("x-manus-cookie", manusCookie);
    // Some Preview relays provide the cookie value only in this header. If it
    // already looks like a Cookie header, also pass it through as Cookie.
    if (!cookie && manusCookie.includes("=")) {
      headers.set("Cookie", manusCookie);
    }
  }
  if (authorization) headers.set("Authorization", authorization);

  return headers;
}

export async function authenticateCmsAdmin(
  req: Request,
  fetchImpl: CmsFetch = fetch
): Promise<CmsAdminUser> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REMOTE_AUTH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetchImpl(CMS_AUTH_ME_URL, {
      method: "GET",
      headers: buildForwardHeaders(req),
      signal: controller.signal,
    });
  } catch {
    throw new CmsAuthError(503, "Authentication service unavailable.");
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 401 || response.status === 403) {
    throw new CmsAuthError(401, "Authentication required.");
  }
  if (!response.ok) {
    throw new CmsAuthError(503, "Authentication service unavailable.");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new CmsAuthError(503, "Authentication service unavailable.");
  }

  const user = unwrapTrpcUser(payload);
  if (!isRecord(user)) {
    throw new CmsAuthError(401, "Authentication required.");
  }

  if (user.role !== "admin") {
    throw new CmsAuthError(403, "Admin access required.");
  }

  return user as CmsAdminUser;
}
