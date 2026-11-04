import type { SiteContent } from "@shared/siteContent";

export type CmsRole = "owner" | "editor";
export type CmsUserId = string;

export type CmsPrincipal = {
  id: CmsUserId;
  username: string;
  name?: string | null;
  role: CmsRole;
  mustChangePassword: boolean;
};

export type CmsSessionResponse = {
  user: CmsPrincipal;
};

export type CmsUserRecord = CmsPrincipal & {
  enabled: boolean;
  createdAt: string;
  googleEmail?: string;
  googleLinked?: boolean;
};

export type CmsUsersResponse = {
  users: CmsUserRecord[];
  revision: string;
};

export type CmsAdminSnapshot = {
  draft: SiteContent | null;
  published: SiteContent | null;
  revision: string;
  updatedAt: string | null;
  publishedAt: string | null;
};

export type CmsUploadResult = {
  url: string;
  filename: string;
};

export type CmsGoogleConfig = {
  configured: boolean;
  clientId: string | null;
};

export type CmsGoogleNonceResponse = {
  nonce: string;
  flowId: string;
};

export class CmsApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(status: number, message: string, payload?: unknown) {
    super(message);
    this.name = "CmsApiError";
    this.status = status;
    this.payload = payload;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function messageFromPayload(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (isRecord(payload)) {
    for (const key of ["message", "error", "detail"]) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}

export async function request<T>(
  path: string,
  init: RequestInit = {},
  writing = false
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (writing) {
    headers.set("Content-Type", "application/json");
    headers.set("X-Solution-CMS", "1");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "include",
      cache: "no-store",
    });
  } catch (error) {
    throw new CmsApiError(
      0,
      error instanceof Error ? error.message : "網路連線失敗。",
      error
    );
  }

  const payload = await readPayload(response);
  if (!response.ok) {
    throw new CmsApiError(
      response.status,
      messageFromPayload(payload, `CMS 請求失敗（${response.status}）。`),
      payload
    );
  }
  return payload as T;
}

export function getCmsSession() {
  return request<CmsSessionResponse>("/api/cms/session");
}

export function loginCms(username: string, password: string) {
  return request<CmsSessionResponse>(
    "/api/cms/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    },
    true
  );
}

export function getCmsGoogleConfig() {
  return request<CmsGoogleConfig>("/api/cms/google/config");
}

export function requestCmsGoogleNonce() {
  return request<CmsGoogleNonceResponse>(
    "/api/cms/google/nonce",
    { method: "POST", body: JSON.stringify({}) },
    true
  );
}

export function loginCmsWithGoogle(credential: string, flowId: string) {
  return request<CmsSessionResponse>(
    "/api/cms/google/login",
    {
      method: "POST",
      body: JSON.stringify({ credential, flowId }),
    },
    true
  );
}

export function logoutCms() {
  return request<{ ok: true }>(
    "/api/cms/logout",
    { method: "POST", body: JSON.stringify({}) },
    true
  );
}

export function changeCmsPassword(
  currentPassword: string,
  newPassword: string
) {
  return request<CmsSessionResponse>(
    "/api/cms/password",
    {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    },
    true
  );
}

export function getCmsUsers() {
  return request<CmsUsersResponse>("/api/cms/users");
}

export function createCmsUser(input: {
  username: string;
  password: string;
  name?: string;
  revision: string;
}) {
  return request<unknown>(
    "/api/cms/users",
    { method: "POST", body: JSON.stringify(input) },
    true
  );
}

export function setCmsUserEnabled(
  id: CmsUserId,
  enabled: boolean,
  revision: string
) {
  return request<unknown>(
    "/api/cms/users",
    { method: "PUT", body: JSON.stringify({ id, enabled, revision }) },
    true
  );
}

export function setCmsUserGoogleEmail(
  id: CmsUserId,
  email: string | null,
  revision: string
) {
  return request<CmsUsersResponse>(
    "/api/cms/users/google",
    {
      method: "PUT",
      body: JSON.stringify({ id, email, revision }),
    },
    true
  );
}

export function deleteCmsUser(id: CmsUserId, revision: string) {
  return request<unknown>(
    "/api/cms/users",
    { method: "DELETE", body: JSON.stringify({ id, revision }) },
    true
  );
}

export function getCmsAdminSnapshot() {
  return request<CmsAdminSnapshot>("/api/cms/admin");
}

export function saveCmsDraft(content: SiteContent, revision: string) {
  return request<CmsAdminSnapshot>(
    "/api/cms/draft",
    {
      method: "PUT",
      body: JSON.stringify({ content, revision }),
    },
    true
  );
}

export function publishCmsContent(content: SiteContent, revision: string) {
  return request<CmsAdminSnapshot>(
    "/api/cms/publish",
    {
      method: "POST",
      body: JSON.stringify({ content, revision }),
    },
    true
  );
}

export function uploadCmsAsset(filename: string, dataUrl: string) {
  return request<CmsUploadResult>(
    "/api/cms/upload",
    {
      method: "POST",
      body: JSON.stringify({ filename, dataUrl }),
    },
    true
  );
}
