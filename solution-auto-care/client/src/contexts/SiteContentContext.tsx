import {
  DEFAULT_SITE_CONTENT,
  CONTENT_FIELDS,
  validateSiteContent,
  type SiteContent,
} from "@shared/siteContent";
import { getCmsAdminSnapshot, getCmsSession } from "@/lib/cms";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type SiteContentContextValue = {
  content: SiteContent;
  loading: boolean;
  error: Error | null;
  text: (key: string) => string;
  image: (key: string) => string;
  reload: () => Promise<void>;
  preview: boolean;
  setPreviewContent: (content: SiteContent | null) => void;
};

export interface SiteContentProviderProps {
  children: ReactNode;
  /** A validated content snapshot for static rendering or an admin preview shell. */
  content?: SiteContent | null;
  /** Alias for content, useful when the parent explicitly labels this as an override. */
  contentOverride?: SiteContent | null;
}

const SiteContentContext = createContext<SiteContentContextValue | undefined>(
  undefined
);

function toError(value: unknown): Error {
  return value instanceof Error
    ? value
    : new Error("Unable to load site content");
}

function isCmsPreviewRequested(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("cms-preview") === "1";
}

function isCmsWorkspaceRequested(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.pathname === "/admin/content";
}

function mergePublicPayload(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return value;
  }
  const candidate = value as {
    schemaVersion?: unknown;
    fields?: unknown;
    posts?: unknown;
  };
  if (
    typeof candidate.fields !== "object" ||
    candidate.fields === null ||
    Array.isArray(candidate.fields)
  ) {
    return value;
  }

  // Older public revisions may omit newly introduced fields. Defaults fill only
  // missing known fields; validateSiteContent still rejects unknown fields.
  return {
    schemaVersion:
      candidate.schemaVersion === undefined ? 1 : candidate.schemaVersion,
    fields: {
      ...DEFAULT_SITE_CONTENT.fields,
      ...(candidate.fields as Record<string, unknown>),
    },
    posts: candidate.posts === undefined ? [] : candidate.posts,
  };
}

export function SiteContentProvider({
  children,
  content,
  contentOverride,
}: SiteContentProviderProps) {
  const suppliedContent = contentOverride ?? content ?? null;
  const hasSuppliedContent = suppliedContent !== null;
  const requestedPreview = isCmsPreviewRequested();
  const cmsWorkspaceRequested = isCmsWorkspaceRequested();
  const suppliedSnapshot = useMemo(
    () => (suppliedContent ? validateSiteContent(suppliedContent) : null),
    [suppliedContent]
  );
  const [remoteContent, setRemoteContent] =
    useState<SiteContent>(DEFAULT_SITE_CONTENT);
  const [previewContent, setPreviewContentState] = useState<SiteContent | null>(
    null
  );
  const [loading, setLoading] = useState(!hasSuppliedContent);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    if (hasSuppliedContent) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // The CMS workspace has its own session gate and does not need public site
    // content while credentials are being entered. This also prevents a first
    // login that still requires a password change from fetching any content.
    if (cmsWorkspaceRequested) {
      setPreviewContentState(null);
      setRemoteContent(DEFAULT_SITE_CONTENT);
      setLoading(false);
      return;
    }

    let publishedContent = DEFAULT_SITE_CONTENT;
    let publishedError: Error | null = null;
    try {
      const response = await fetch("/api/cms/public", {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          `Public site content request failed (${response.status})`
        );
      }
      const payload: unknown = await response.json();
      if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload) ||
        !("content" in payload)
      ) {
        throw new Error("Public site content response is malformed");
      }
      publishedContent = validateSiteContent(
        mergePublicPayload((payload as { content: unknown }).content)
      );
    } catch (value) {
      // The immutable default remains active so the homepage is still usable.
      publishedError = toError(value);
    }
    setRemoteContent(publishedContent);

    if (!requestedPreview) {
      setPreviewContentState(null);
      setError(publishedError);
      setLoading(false);
      return;
    }

    try {
      const session = await getCmsSession();
      if (session.user.mustChangePassword) {
        throw new Error(
          "CMS preview requires the password change to be completed"
        );
      }
      const snapshot = await getCmsAdminSnapshot();

      // The CMS session plus successful admin response are the authorization
      // boundary. Never use a draft-shaped value from an unauthorized response.
      if (!snapshot.draft) {
        setPreviewContentState(null);
      } else {
        setPreviewContentState(validateSiteContent(snapshot.draft));
      }
      setError(publishedError);
    } catch (value) {
      // A failed admin request must fall back to published content and must not
      // leave the UI claiming that it is showing a preview.
      setPreviewContentState(null);
      setError(toError(value));
    } finally {
      setLoading(false);
    }
  }, [cmsWorkspaceRequested, hasSuppliedContent, requestedPreview]);

  useEffect(() => {
    if (hasSuppliedContent) {
      setLoading(false);
      return;
    }
    void reload();
  }, [hasSuppliedContent, reload]);

  const setPreviewContent = useCallback((nextContent: SiteContent | null) => {
    if (nextContent === null) {
      setPreviewContentState(null);
      return;
    }
    try {
      setPreviewContentState(validateSiteContent(nextContent));
      setError(null);
    } catch (value) {
      setError(toError(value));
    }
  }, []);

  const activeContent = previewContent ?? suppliedSnapshot ?? remoteContent;
  const preview = previewContent !== null || suppliedSnapshot !== null;

  const text = useCallback(
    (key: string) => {
      if (!Object.prototype.hasOwnProperty.call(activeContent.fields, key)) {
        return "";
      }
      return activeContent.fields[key] ?? "";
    },
    [activeContent]
  );

  const image = useCallback(
    (key: string) => {
      const definition = CONTENT_FIELDS.find(item => item.key === key);
      if (definition?.type !== "image") return "";
      return activeContent.fields[key] ?? "";
    },
    [activeContent]
  );

  const value = useMemo<SiteContentContextValue>(
    () => ({
      content: activeContent,
      loading,
      error,
      text,
      image,
      reload,
      preview,
      setPreviewContent,
    }),
    [
      activeContent,
      error,
      image,
      loading,
      preview,
      reload,
      setPreviewContent,
      text,
    ]
  );

  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent(): SiteContentContextValue {
  const context = useContext(SiteContentContext);
  if (!context) {
    throw new Error("useSiteContent must be used within SiteContentProvider");
  }
  return context;
}
