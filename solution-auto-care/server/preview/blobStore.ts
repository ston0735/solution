import { del, head, list, put } from "@vercel/blob";

/**
 * Vercel Blob access for the preview service.
 *
 * The project's existing store (`solution-site-cms`) is a **private** store, so
 * generated previews cannot be published as public objects. They are read back
 * through this service's own image route, which presents the store token
 * server-side; the browser never receives a credential and no URL is exposed
 * outside the site origin.
 *
 * Objects are immutable, so usage counters and leases append small marker
 * objects and are read by listing a prefix instead of overwriting state.
 */
export type BlobMarker = {
  url: string;
  pathname: string;
  uploadedAt: string;
};

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

export function getBlobToken(): string {
  return (
    process.env.WRAP_PREVIEW_BLOB_TOKEN ??
    process.env.BLOB_READ_WRITE_TOKEN ??
    ""
  );
}

export function isStoredBlobUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname.endsWith(BLOB_HOST_SUFFIX) &&
      url.pathname.startsWith("/generated/")
    );
  } catch {
    return false;
  }
}

function requireToken(): string {
  const token = getBlobToken();
  if (!token) throw new Error("PREVIEW_STORAGE_UNAVAILABLE");
  return token;
}

function toMarker(entry: unknown): BlobMarker | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const blob = entry as {
    url?: unknown;
    pathname?: unknown;
    uploadedAt?: unknown;
  };
  if (typeof blob.url !== "string" || typeof blob.pathname !== "string") {
    return undefined;
  }
  return {
    url: blob.url,
    pathname: blob.pathname,
    uploadedAt:
      blob.uploadedAt instanceof Date
        ? blob.uploadedAt.toISOString()
        : typeof blob.uploadedAt === "string"
          ? blob.uploadedAt
          : "",
  };
}

export async function putBlobFile(
  pathname: string,
  body: Buffer | string,
  contentType: string
): Promise<string> {
  const token = requireToken();
  const blob = await put(pathname, body, {
    access: "private",
    addRandomSuffix: false,
    contentType,
    token,
  });
  return blob.url;
}

export async function listByPrefix(
  prefix: string,
  limit = 100
): Promise<BlobMarker[]> {
  const token = requireToken();
  const markers: BlobMarker[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ prefix, limit, cursor, token });
    for (const entry of result.blobs ?? []) {
      const marker = toMarker(entry);
      if (marker) markers.push(marker);
    }
    cursor = result.hasMore && result.cursor ? result.cursor : undefined;
  } while (cursor && markers.length < 1_000);
  return markers;
}

async function readBlobResponse(
  url: string
): Promise<{ status: number; body: ArrayBuffer }> {
  const token = getBlobToken();
  const attempts: RequestInit[] = [
    { cache: "no-store", headers: { Authorization: `Bearer ${token}` } },
    { cache: "no-store" },
  ];
  let lastStatus = 0;
  for (const init of attempts) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(20_000),
      });
      if (response.ok) {
        return { status: response.status, body: await response.arrayBuffer() };
      }
      lastStatus = response.status;
    } catch {
      // Try the next access mode before reporting a failure.
    }
  }
  return { status: lastStatus || 502, body: new ArrayBuffer(0) };
}

export async function readBlobBuffer(url: string): Promise<Buffer> {
  const result = await readBlobResponse(url);
  if (!result.body.byteLength) {
    throw new Error("PREVIEW_STORAGE_READ_FAILED");
  }
  return Buffer.from(result.body);
}

export async function readBlobWithStatus(
  url: string
): Promise<{ status: number; byteLength: number; contentType: string }> {
  const token = getBlobToken();
  const bearer = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (bearer && bearer.ok) {
    const body = await bearer.arrayBuffer();
    return {
      status: bearer.status,
      byteLength: body.byteLength,
      contentType: bearer.headers.get("content-type") ?? "",
    };
  }
  const plain = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  return {
    status: (bearer?.status ?? 0) || (plain?.status ?? 502),
    byteLength: plain && plain.ok ? (await plain.arrayBuffer()).byteLength : 0,
    contentType: plain?.headers.get("content-type") ?? "",
  };
}

export async function readLatestJson<T>(
  prefix: string
): Promise<T | undefined> {
  const markers = await listByPrefix(prefix, 100);
  if (!markers.length) return undefined;
  markers.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  const latest = markers[0];
  if (!latest) return undefined;
  try {
    const result = await readBlobResponse(latest.url);
    if (!result.body.byteLength) return undefined;
    return JSON.parse(new TextDecoder().decode(result.body)) as T;
  } catch {
    return undefined;
  }
}

export async function deleteByUrl(url: string): Promise<void> {
  try {
    await del(url, { token: getBlobToken() });
  } catch {
    // A failed release is recovered by the lease staleness window.
  }
}

export async function blobExists(url: string): Promise<boolean> {
  try {
    return (await head(url, { token: getBlobToken() })) != null;
  } catch {
    return false;
  }
}
