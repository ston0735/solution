import { get as blobGet, put as blobPut } from "@vercel/blob";
import {
  DEFAULT_SITE_CONTENT,
  validateSiteContent,
  type SiteContent,
} from "../../shared/siteContent";
import { CmsConflictError, CmsStorageError } from "./errors";

export const CMS_DOCUMENT_PATH = "cms/site.json";
export const INITIAL_REVISION = "0";

export type CmsDocument = {
  draft: SiteContent;
  published: SiteContent;
  revision: string;
  updatedAt: string | null;
  publishedAt: string | null;
};

export type CmsSnapshot = {
  document: CmsDocument;
  etag: string | null;
  exists: boolean;
};

export type CmsBlobGetResult = {
  statusCode: number;
  stream: ReadableStream<Uint8Array> | null;
  blob: {
    pathname: string;
    contentType: string | null;
    etag: string;
  };
};

type CmsBlobPutOptions = {
  access: "private";
  allowOverwrite: boolean;
  contentType?: string;
  ifMatch?: string;
  token?: string;
};

export interface CmsBlobClient {
  get(
    pathname: string,
    options: { access: "private"; useCache: false; token?: string }
  ): Promise<CmsBlobGetResult | null>;
  put(
    pathname: string,
    body: unknown,
    options: CmsBlobPutOptions
  ): Promise<unknown>;
}

export function withCmsBlobToken<T extends object>(options: T) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  return token ? { ...options, token } : options;
}

const defaultBlobClient: CmsBlobClient = {
  get: async (pathname, options) =>
    (await blobGet(
      pathname,
      withCmsBlobToken(options)
    )) as unknown as CmsBlobGetResult | null,
  put: async (pathname, body, options) =>
    blobPut(
      pathname,
      body as Parameters<typeof blobPut>[1],
      withCmsBlobToken(options)
    ),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeDiagnosticString(value: unknown): string | undefined {
  return typeof value === "string" && /^[A-Za-z0-9_.:-]{1,80}$/.test(value)
    ? value
    : undefined;
}

function logBlobFailure(operation: string, error: unknown): void {
  const source = isRecord(error) ? error : {};
  const status = source.status ?? source.statusCode;
  console.error(
    JSON.stringify({
      event: "cms_blob_operation_failed",
      operation,
      name: safeDiagnosticString(source.name),
      code: safeDiagnosticString(source.code),
      status:
        typeof status === "number" && Number.isInteger(status)
          ? status
          : undefined,
      causeName: isRecord(source.cause)
        ? safeDiagnosticString(source.cause.name)
        : undefined,
      causeCode: isRecord(source.cause)
        ? safeDiagnosticString(source.cause.code)
        : undefined,
    })
  );
}

function cloneContent(content: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}

export function createInitialCmsDocument(): CmsDocument {
  const content = cloneContent(DEFAULT_SITE_CONTENT);
  return {
    draft: cloneContent(content),
    published: cloneContent(content),
    revision: INITIAL_REVISION,
    updatedAt: null,
    publishedAt: null,
  };
}

function parseNullableTimestamp(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new CmsStorageError("CMS document is invalid.");
  }
  return value;
}

function parseCmsDocument(value: unknown): CmsDocument {
  if (!isRecord(value)) throw new CmsStorageError("CMS document is invalid.");

  const revision = value.revision;
  if (typeof revision !== "string" || !revision || revision.length > 200) {
    throw new CmsStorageError("CMS document is invalid.");
  }

  try {
    return {
      draft: validateSiteContent(value.draft),
      published: validateSiteContent(value.published),
      revision,
      updatedAt: parseNullableTimestamp(value.updatedAt),
      publishedAt: parseNullableTimestamp(value.publishedAt),
    };
  } catch (error) {
    if (error instanceof CmsStorageError) throw error;
    throw new CmsStorageError("CMS document is invalid.");
  }
}

function isBlobConflict(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const name = typeof error.name === "string" ? error.name : "";
  const code = typeof error.code === "string" ? error.code : "";
  const message = typeof error.message === "string" ? error.message : "";
  const status = error.status ?? error.statusCode;
  return (
    name.includes("Precondition") ||
    code.includes("Precondition") ||
    name.includes("AlreadyExists") ||
    code.includes("AlreadyExists") ||
    /already exists|overwrite/i.test(message) ||
    status === 409 ||
    status === 412
  );
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  try {
    return Buffer.from(await new Response(stream).arrayBuffer());
  } catch {
    throw new CmsStorageError("CMS storage is unavailable.");
  }
}

function isBlobConfiguredByEnvironment(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN)
  );
}

export type CmsStore = {
  readonly configured: boolean;
  readSnapshot(): Promise<CmsSnapshot>;
  writeSnapshot(snapshot: CmsSnapshot, document: CmsDocument): Promise<void>;
  uploadMedia(pathname: string, body: Buffer): Promise<void>;
  readMedia(pathname: string): Promise<{
    body: Buffer;
    contentType: string | null;
  } | null>;
};

export function createCmsStore(
  client: CmsBlobClient = defaultBlobClient,
  options: { configured?: boolean } = {}
): CmsStore {
  const configured = options.configured ?? isBlobConfiguredByEnvironment();

  return {
    configured,

    async readSnapshot(): Promise<CmsSnapshot> {
      let result: CmsBlobGetResult | null;
      try {
        result = await client.get(CMS_DOCUMENT_PATH, {
          access: "private",
          useCache: false,
        });
      } catch (error) {
        logBlobFailure("site_document_read", error);
        throw new CmsStorageError("CMS storage is unavailable.");
      }

      if (!result || result.statusCode === 404) {
        return {
          document: createInitialCmsDocument(),
          etag: null,
          exists: false,
        };
      }
      if (result.statusCode !== 200 || !result.stream) {
        throw new CmsStorageError("CMS storage is unavailable.");
      }

      const raw = await readStream(result.stream);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString("utf8"));
      } catch {
        throw new CmsStorageError("CMS document is invalid.");
      }

      return {
        document: parseCmsDocument(parsed),
        etag: result.blob.etag,
        exists: true,
      };
    },

    async writeSnapshot(snapshot, document): Promise<void> {
      const options: CmsBlobPutOptions = {
        access: "private",
        allowOverwrite: snapshot.exists,
        contentType: "application/json; charset=utf-8",
      };
      if (snapshot.exists) {
        if (!snapshot.etag) throw new CmsConflictError();
        options.ifMatch = snapshot.etag;
      }

      try {
        await client.put(CMS_DOCUMENT_PATH, JSON.stringify(document), options);
      } catch (error) {
        if (isBlobConflict(error)) throw new CmsConflictError();
        logBlobFailure("site_document_write", error);
        throw new CmsStorageError("CMS storage is unavailable.");
      }
    },

    async uploadMedia(pathname, body): Promise<void> {
      try {
        await client.put(pathname, body, {
          access: "private",
          allowOverwrite: false,
          contentType: "image/webp",
        });
      } catch (error) {
        if (isBlobConflict(error)) throw new CmsConflictError();
        logBlobFailure("site_media_write", error);
        throw new CmsStorageError("CMS storage is unavailable.");
      }
    },

    async readMedia(pathname) {
      let result: CmsBlobGetResult | null;
      try {
        result = await client.get(pathname, {
          access: "private",
          useCache: false,
        });
      } catch (error) {
        logBlobFailure("site_media_read", error);
        throw new CmsStorageError("CMS storage is unavailable.");
      }
      if (!result || result.statusCode === 404) return null;
      if (result.statusCode !== 200 || !result.stream) {
        throw new CmsStorageError("CMS storage is unavailable.");
      }
      return {
        body: await readStream(result.stream),
        contentType: result.blob.contentType,
      };
    },
  };
}
