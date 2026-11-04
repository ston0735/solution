import type { SiteContent } from "@shared/siteContent";

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

async function request<T>(
  path: string,
  init: RequestInit = {},
  writing = false
): Promise<T> {
  const headers = new Headers(init.headers);
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
