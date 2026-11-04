import express, { type Express, type Request, type Response } from "express";
import {
  authenticateCmsAdmin,
  type CmsAdminUser,
  type CmsAuthenticator,
} from "./auth";
import {
  CmsAuthError,
  CmsConflictError,
  CmsHttpError,
  CmsNotFoundError,
  CmsStorageError,
  CmsValidationError,
} from "./errors";
import {
  createMediaPath,
  createMediaUrl,
  isSafeMediaPath,
  sanitizeImageDataUrl,
  sanitizeUploadFilename,
} from "./media";
import {
  createCmsStore,
  createInitialCmsDocument,
  INITIAL_REVISION,
  type CmsDocument,
  type CmsSnapshot,
  type CmsStore,
} from "./store";
import {
  validateSiteContent,
  type SiteContent,
} from "../../shared/siteContent";

const CMS_PREFIX = "/api/cms";
const CMS_WRITE_HEADER = "X-Solution-CMS";

export type CmsRouteOptions = {
  store?: CmsStore;
  authenticateAdmin?: CmsAuthenticator;
  now?: () => Date;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getCmsPath(req: Request): string | null {
  const requestPath = req.path || req.url.split("?")[0];
  const queryPath = req.query.path;
  if (requestPath === CMS_PREFIX || requestPath === `${CMS_PREFIX}/`) {
    if (typeof queryPath === "string") return normalizeCmsPath(queryPath);
    if (Array.isArray(queryPath)) return null;
  }

  if (requestPath === CMS_PREFIX || requestPath === `${CMS_PREFIX}/`) {
    return "";
  }
  if (!requestPath.startsWith(`${CMS_PREFIX}/`)) return null;
  return normalizeCmsPath(requestPath.slice(`${CMS_PREFIX}/`.length));
}

function normalizeCmsPath(value: string): string | null {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  decoded = decoded.replace(/^\/+|\/+$/g, "");
  if (!decoded || decoded.includes("\\") || decoded.includes("..")) {
    return null;
  }
  return decoded;
}

function getBodyRevision(body: unknown): string {
  if (!isRecord(body) || typeof body.revision !== "string") {
    throw new CmsValidationError("A content revision is required.");
  }
  if (!body.revision || body.revision.length > 200) {
    throw new CmsValidationError("The content revision is invalid.");
  }
  return body.revision;
}

function getBodyContent(body: unknown): SiteContent {
  if (
    !isRecord(body) ||
    !Object.prototype.hasOwnProperty.call(body, "content")
  ) {
    throw new CmsValidationError("Content is required.");
  }
  try {
    return validateSiteContent(body.content);
  } catch {
    throw new CmsValidationError("Content does not match the CMS schema.");
  }
}

function cloneContent(content: SiteContent): SiteContent {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}

function adminDocument(document: CmsDocument) {
  return {
    draft: document.draft,
    published: document.published,
    revision: document.revision,
    updatedAt: document.updatedAt,
    publishedAt: document.publishedAt,
  };
}

function assertExpectedRevision(snapshot: CmsSnapshot, revision: string): void {
  const currentRevision = snapshot.exists
    ? snapshot.document.revision
    : INITIAL_REVISION;
  if (revision !== currentRevision) throw new CmsConflictError();
}

function assertTrustedWrite(req: Request): void {
  if (req.get(CMS_WRITE_HEADER) !== "1") {
    throw new CmsHttpError(403, "CMS write protection failed.");
  }

  const origin = req.get("Origin");
  if (!origin || !isTrustedCmsOrigin(origin)) {
    throw new CmsHttpError(403, "CMS write protection failed.");
  }
}

export function isTrustedCmsOrigin(origin: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search
  ) {
    return false;
  }

  if (
    parsed.origin === "https://solution-wrap.com" ||
    parsed.origin === "https://www.solution-wrap.com" ||
    parsed.origin === "http://127.0.0.1:3000" ||
    parsed.origin === "http://localhost:3000" ||
    parsed.origin === "https://solution-car-wrap.vercel.app"
  ) {
    return true;
  }

  const isTrustedVercelPreview =
    parsed.protocol === "https:" &&
    parsed.port === "" &&
    /^solution-car-wrap-[a-z0-9-]+-ston0735-9216s-projects\.vercel\.app$/i.test(
      parsed.hostname
    );
  if (isTrustedVercelPreview) return true;

  return (
    parsed.protocol === "https:" &&
    parsed.port === "" &&
    /^(?:[a-z0-9-]+\.)+manus\.computer$/i.test(parsed.hostname)
  );
}

function sendError(res: Response, error: unknown): void {
  if (error instanceof CmsHttpError) {
    res.status(error.status).json({ error: error.safeMessage });
    return;
  }
  // Do not include exception text: storage/auth errors can contain secrets or
  // provider request details. The caller only needs a stable status.
  res.status(500).json({ error: "CMS request failed." });
}

async function authenticate(
  req: Request,
  authenticateAdmin: CmsAuthenticator
): Promise<CmsAdminUser> {
  try {
    return await authenticateAdmin(req);
  } catch (error) {
    if (error instanceof CmsAuthError) throw error;
    throw new CmsAuthError(503, "Authentication service unavailable.");
  }
}

export function registerCmsRoutes(
  app: Express,
  options: CmsRouteOptions = {}
): Express {
  const store = options.store ?? createCmsStore();
  const authenticateAdmin = options.authenticateAdmin ?? authenticateCmsAdmin;
  const now = options.now ?? (() => new Date());

  const handle = async (req: Request, res: Response): Promise<void> => {
    const route = getCmsPath(req);
    if (route === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (req.method === "OPTIONS") {
      // Deliberately do not emit Access-Control-Allow-* headers. CMS writes are
      // same-origin/explicit-origin requests, not a permissive CORS API.
      res.status(204).end();
      return;
    }

    try {
      if (req.method === "GET" && route === "status") {
        res.json({ configured: store.configured });
        return;
      }

      if (req.method === "GET" && route === "public") {
        if (!store.configured) {
          const initial = createInitialCmsDocument();
          res.json({ content: initial.published, revision: initial.revision });
          return;
        }
        const snapshot = await store.readSnapshot();
        res.json({
          content: snapshot.document.published,
          revision: snapshot.document.revision,
        });
        return;
      }

      if (req.method === "GET" && route === "media") {
        const key = req.query.key;
        if (!isSafeMediaPath(key)) throw new CmsNotFoundError();
        if (!store.configured) throw new CmsStorageError();
        const media = await store.readMedia(key);
        if (!media) throw new CmsNotFoundError();
        if (media.contentType && media.contentType !== "image/webp") {
          throw new CmsNotFoundError();
        }
        res.setHeader("Content-Type", "image/webp");
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        res.status(200).end(media.body);
        return;
      }

      if (req.method === "GET" && route === "admin") {
        await authenticate(req, authenticateAdmin);
        if (!store.configured) throw new CmsStorageError();
        const snapshot = await store.readSnapshot();
        res.json(adminDocument(snapshot.document));
        return;
      }

      if (route === "draft" || route === "publish" || route === "upload") {
        if (req.method !== "PUT" && req.method !== "POST") {
          res.setHeader("Allow", route === "draft" ? "PUT" : "POST");
          res.status(405).json({ error: "Method not allowed" });
          return;
        }
        assertTrustedWrite(req);
        await authenticate(req, authenticateAdmin);
        if (!store.configured) throw new CmsStorageError();
      }

      if (req.method === "PUT" && route === "draft") {
        const revision = getBodyRevision(req.body);
        const content = getBodyContent(req.body);
        const snapshot = await store.readSnapshot();
        assertExpectedRevision(snapshot, revision);
        const updatedAt = now().toISOString();
        const document: CmsDocument = {
          ...snapshot.document,
          draft: cloneContent(content),
          revision: crypto.randomUUID(),
          updatedAt,
        };
        await store.writeSnapshot(snapshot, document);
        res.json(adminDocument(document));
        return;
      }

      if (req.method === "POST" && route === "publish") {
        const revision = getBodyRevision(req.body);
        const content = getBodyContent(req.body);
        const snapshot = await store.readSnapshot();
        assertExpectedRevision(snapshot, revision);
        const publishedAt = now().toISOString();
        const document: CmsDocument = {
          ...snapshot.document,
          draft: cloneContent(content),
          published: cloneContent(content),
          revision: crypto.randomUUID(),
          updatedAt: publishedAt,
          publishedAt,
        };
        await store.writeSnapshot(snapshot, document);
        res.json(adminDocument(document));
        return;
      }

      if (req.method === "POST" && route === "upload") {
        if (!isRecord(req.body)) {
          throw new CmsValidationError("Upload body is required.");
        }
        const filename = sanitizeUploadFilename(req.body.filename);
        const webp = await sanitizeImageDataUrl(req.body.dataUrl);
        const pathname = createMediaPath();
        await store.uploadMedia(pathname, webp);
        res.json({ url: createMediaUrl(pathname), filename });
        return;
      }

      res.setHeader("Allow", "GET, PUT, POST, OPTIONS");
      res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
      sendError(res, error);
    }
  };

  app.options(`${CMS_PREFIX}`, handle);
  app.options(`${CMS_PREFIX}/*`, handle);
  app.all(`${CMS_PREFIX}`, handle);
  app.all(`${CMS_PREFIX}/*`, handle);
  return app;
}

export function createCmsApp(options: CmsRouteOptions = {}): Express {
  const app = express();
  app.use(express.json({ limit: "8mb" }));
  registerCmsRoutes(app, options);
  return app;
}
