import {
  CmsAccessGate,
  CmsAccountControls,
  CmsAuthProvider,
  useCmsAuth,
} from "@/components/CmsAccessGate";
import CmsUsersPanel from "@/components/CmsUsersPanel";
import {
  CmsApiError,
  getCmsAdminSnapshot,
  publishCmsContent,
  saveCmsDraft,
  uploadCmsAsset,
  type CmsAdminSnapshot,
} from "@/lib/cms";
import {
  CONTENT_FIELDS,
  DEFAULT_SITE_CONTENT,
  validateSiteContent,
  type BlogPost,
  type SiteContent,
} from "@shared/siteContent";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Globe2,
  Image as ImageIcon,
  LayoutDashboard,
  LoaderCircle,
  Newspaper,
  Palette,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Trash2,
  Type,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PREVIEW_PATHS: Record<string, string> = {
  home: "/",
  services: "/services",
  "ai-color": "/ai-color",
  process: "/process",
  blog: "/blog",
  about: "/about",
  contact: "/contact",
  global: "/",
  error: "/",
};

const PAGE_LABELS: Record<string, string> = {
  home: "首頁",
  services: "服務",
  service: "服務",
  "ai-color": "AI 配色",
  ai: "AI 配色",
  process: "施工流程",
  blog: "部落格",
  about: "關於我們",
  contact: "聯絡我們",
  error: "錯誤頁",
  nav: "主導覽",
  global: "全站設定",
  site: "全站設定",
  settings: "全站設定",
};

const PAGE_ICONS: Record<string, LucideIcon> = {
  home: LayoutDashboard,
  services: Settings2,
  service: Settings2,
  "ai-color": Palette,
  ai: Palette,
  process: CheckCircle2,
  blog: Newspaper,
  about: Globe2,
  contact: ArrowUpRight,
  error: AlertTriangle,
  global: Settings2,
  site: Settings2,
  settings: Settings2,
};

const inputClass =
  "w-full border border-white/12 bg-[#0e100d] px-3.5 py-3 text-sm text-[#f4f5ed] outline-none transition-colors placeholder:text-white/30 focus:border-[#a9ff44]/70 focus:ring-2 focus:ring-[#a9ff44]/15";
const mutedInputClass =
  "w-full border border-white/10 bg-[#11130f] px-3 py-2.5 text-sm text-[#dfe4d8] outline-none transition-colors placeholder:text-white/30 focus:border-[#a9ff44]/60 focus:ring-2 focus:ring-[#a9ff44]/15";

function cloneContent(content: SiteContent): SiteContent {
  return {
    schemaVersion: 1,
    fields: { ...content.fields },
    posts: content.posts.map(post => ({ ...post })),
  };
}

function serializeContent(content: SiteContent) {
  return JSON.stringify(content);
}

function pageLabel(page: string) {
  const key = page.trim().toLowerCase();
  return (
    PAGE_LABELS[key] ??
    page.replace(/[-_]/g, " ").replace(/^./, char => char.toUpperCase())
  );
}

function pageIcon(page: string) {
  return PAGE_ICONS[page.trim().toLowerCase()] ?? FileText;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "尚未記錄";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "尚未記錄"
    : new Intl.DateTimeFormat("zh-TW", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function friendlyError(error: unknown) {
  if (error instanceof CmsApiError) {
    if (error.status === 0) return "無法連線到 CMS，請確認網路後重試。";
    if (error.status === 401) return "登入狀態已失效，請重新登入。";
    if (error.status === 403) return "你的帳戶沒有 CMS 管理權限。";
    if (error.status === 409) return "伺服器內容已被其他管理員更新。";
    if (error.status === 413) return "檔案或內容太大，請縮小後再試。";
    if (error.status === 422) return error.message || "內容格式無法通過驗證。";
    return error.message || `CMS 請求失敗（${error.status}）。`;
  }
  return error instanceof Error
    ? error.message
    : "發生未預期錯誤，請稍後再試。";
}

function isValidContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SiteContent>;
  if (candidate.schemaVersion !== 1) return false;
  if (!candidate.fields || typeof candidate.fields !== "object") return false;
  if (!Array.isArray(candidate.posts)) return false;
  if (
    Object.values(candidate.fields).some(field => typeof field !== "string") ||
    candidate.posts.some(post => {
      if (!post || typeof post !== "object") return true;
      const item = post as Partial<BlogPost>;
      return [
        item.id,
        item.slug,
        item.title,
        item.category,
        item.summary,
        item.body,
        item.image,
        item.published,
        item.date,
      ].some(value => typeof value !== "string" && typeof value !== "boolean");
    })
  ) {
    return false;
  }
  try {
    const result = validateSiteContent(candidate as SiteContent);
    return typeof result === "boolean" ? result : true;
  } catch {
    return false;
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `post-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("檔案讀取失敗。"));
    };
    reader.onerror = () => reject(new Error("檔案讀取失敗。"));
    reader.readAsDataURL(file);
  });
}

function EmptyImagePreview({ label }: { label: string }) {
  return (
    <div className="flex h-36 items-center justify-center border border-dashed border-white/15 bg-[#0b0d0b] text-center text-xs text-white/35">
      <div>
        <ImageIcon className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </div>
  );
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  if (!src.trim()) return <EmptyImagePreview label="尚未設定圖片" />;
  return (
    <div className="relative h-36 overflow-hidden border border-white/10 bg-[#0b0d0b]">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={event => {
          event.currentTarget.style.display = "none";
        }}
      />
      <span className="absolute bottom-2 left-2 max-w-[90%] truncate bg-black/75 px-2 py-1 text-[10px] text-white/75">
        {src}
      </span>
    </div>
  );
}

function CmsContentEditor() {
  const { user, clearSession } = useCmsAuth();
  const isOwner = user?.role === "owner";

  const [content, setContent] = useState<SiteContent | null>(null);
  const [baseline, setBaseline] = useState("");
  const [publishedContent, setPublishedContent] = useState<SiteContent | null>(
    null
  );
  const [revision, setRevision] = useState("0");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [activePage, setActivePage] = useState("");
  const [activeTab, setActiveTab] = useState<"fields" | "posts" | "users">(
    "fields"
  );
  const [search, setSearch] = useState("");
  const [loadingDocument, setLoadingDocument] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [conflictOpen, setConflictOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const previewDialogRef = useRef<HTMLDialogElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const hasUnsavedChanges = Boolean(
    content && serializeContent(content) !== baseline
  );
  const busy = Boolean(saving || uploadingTarget || loadingDocument);

  const pageEntries = useMemo(() => {
    const grouped = new Map<string, (typeof CONTENT_FIELDS)[number][]>();
    for (const field of CONTENT_FIELDS) {
      const page = String(field.page || "global");
      const fields = grouped.get(page) ?? [];
      fields.push(field);
      grouped.set(page, fields);
    }
    return Array.from(grouped.entries()).map(([page, fields]) => ({
      page,
      label: pageLabel(page),
      Icon: pageIcon(page),
      fields,
    }));
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredPages = useMemo(() => {
    if (!normalizedSearch) return pageEntries;
    return pageEntries.filter(entry => {
      return (
        entry.label.toLowerCase().includes(normalizedSearch) ||
        entry.page.toLowerCase().includes(normalizedSearch) ||
        entry.fields.some(
          field =>
            field.label.toLowerCase().includes(normalizedSearch) ||
            field.key.toLowerCase().includes(normalizedSearch)
        )
      );
    });
  }, [normalizedSearch, pageEntries]);

  const currentPage =
    pageEntries.find(entry => entry.page === activePage) ??
    pageEntries[0] ??
    null;
  const visibleFields = currentPage
    ? currentPage.fields.filter(field => {
        if (!normalizedSearch) return true;
        return (
          field.label.toLowerCase().includes(normalizedSearch) ||
          field.key.toLowerCase().includes(normalizedSearch) ||
          currentPage.label.toLowerCase().includes(normalizedSearch)
        );
      })
    : [];

  useEffect(() => {
    if (!activePage && pageEntries[0]) setActivePage(pageEntries[0].page);
  }, [activePage, pageEntries]);

  useEffect(() => {
    if (
      filteredPages.length &&
      !filteredPages.some(entry => entry.page === activePage)
    ) {
      setActivePage(filteredPages[0].page);
    }
  }, [activePage, filteredPages]);

  const applySnapshot = useCallback((snapshot: CmsAdminSnapshot) => {
    const source = snapshot.draft ?? snapshot.published ?? DEFAULT_SITE_CONTENT;
    const next = cloneContent(source);
    setContent(next);
    setBaseline(serializeContent(next));
    setPublishedContent(
      snapshot.published ? cloneContent(snapshot.published) : null
    );
    setRevision(snapshot.revision);
    setUpdatedAt(snapshot.updatedAt ?? null);
    setPublishedAt(snapshot.publishedAt ?? null);
    setLoadError("");
    setActionError("");
  }, []);

  const handleCmsAccessLost = useCallback(() => {
    setContent(null);
    setBaseline("");
    setPublishedContent(null);
    setRevision("0");
    setUpdatedAt(null);
    setPublishedAt(null);
    setLoadError("");
    setActionError("");
    setStatusMessage("");
    setConflictOpen(false);
    clearSession();
  }, [clearSession]);

  const fetchSnapshot = useCallback(async () => {
    setLoadingDocument(true);
    setLoadError("");
    setActionError("");
    try {
      const snapshot = await getCmsAdminSnapshot();
      applySnapshot(snapshot);
    } catch (error) {
      if (
        error instanceof CmsApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        handleCmsAccessLost();
        return;
      }
      const message = friendlyError(error);
      setLoadError(message);
      setActionError("");
    } finally {
      setLoadingDocument(false);
    }
  }, [applySnapshot, handleCmsAccessLost]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      window.onbeforeunload = null;
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const dialog = previewDialogRef.current;
    if (!dialog) return;
    if (previewOpen && !dialog.open) dialog.showModal();
    if (!previewOpen && dialog.open) dialog.close();
  }, [previewOpen]);

  const updateField = useCallback((key: string, value: string) => {
    setContent(current =>
      current
        ? { ...current, fields: { ...current.fields, [key]: value } }
        : current
    );
    setStatusMessage("");
    setActionError("");
  }, []);

  const updatePost = useCallback(
    (id: string, key: keyof BlogPost, value: string | boolean) => {
      setContent(current =>
        current
          ? {
              ...current,
              posts: current.posts.map(post =>
                post.id === id ? { ...post, [key]: value } : post
              ),
            }
          : current
      );
      setStatusMessage("");
      setActionError("");
    },
    []
  );

  const handleAssetUpload = useCallback(
    async (target: string, file: File, onSuccess: (url: string) => void) => {
      if (!content || uploadingTarget) return;
      if (file.size > MAX_UPLOAD_BYTES) {
        setActionError(
          "圖片大小不可超過 3 MB。請選擇較小的 JPEG、PNG 或 WebP。\n"
        );
        return;
      }
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        setActionError("只接受 JPEG、PNG 或 WebP 圖片格式。");
        return;
      }
      setUploadingTarget(target);
      setActionError("");
      setStatusMessage("正在上傳圖片，成功後才會更新本機內容…");
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const result = await uploadCmsAsset(file.name, dataUrl);
        onSuccess(result.url);
        setStatusMessage(`圖片已上傳：${result.filename}`);
      } catch (error) {
        if (
          error instanceof CmsApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          handleCmsAccessLost();
          return;
        }
        setActionError(`圖片上傳失敗：${friendlyError(error)}`);
      } finally {
        setUploadingTarget(null);
      }
    },
    [content, handleCmsAccessLost, uploadingTarget]
  );

  const validateBeforeSave = useCallback(() => {
    if (!content) return "目前沒有可儲存的內容。";
    if (loadError)
      return "目前文件讀取失敗，請先成功重新載入，避免覆蓋未知內容。";
    if (!isValidContent(content))
      return "內容格式無法通過驗證，請檢查欄位與文章資料。";
    const slugs = new Set<string>();
    for (const post of content.posts) {
      const slug = post.slug.trim();
      if (!slug) continue;
      if (slugs.has(slug)) return `文章 slug「${slug}」重複，請先修改。`;
      slugs.add(slug);
    }
    return "";
  }, [content, loadError]);

  const applySavedResponse = useCallback(
    (snapshot: CmsAdminSnapshot) => {
      const source =
        snapshot.draft ?? snapshot.published ?? content ?? DEFAULT_SITE_CONTENT;
      const next = cloneContent(source);
      setContent(next);
      setBaseline(serializeContent(next));
      setPublishedContent(
        snapshot.published ? cloneContent(snapshot.published) : publishedContent
      );
      setRevision(snapshot.revision);
      setUpdatedAt(snapshot.updatedAt ?? null);
      setPublishedAt(snapshot.publishedAt ?? null);
      setConflictOpen(false);
    },
    [content, publishedContent]
  );

  const handleSave = useCallback(
    async (mode: "draft" | "publish") => {
      const validationError = validateBeforeSave();
      if (validationError || !content || busy) {
        if (validationError) setActionError(validationError);
        return;
      }
      setSaving(mode);
      setActionError("");
      setStatusMessage("");
      try {
        const snapshot =
          mode === "draft"
            ? await saveCmsDraft(content, revision)
            : await publishCmsContent(content, revision);
        applySavedResponse(snapshot);
        setStatusMessage(
          mode === "draft" ? "草稿已儲存，尚未公開。" : "內容已發布到網站。 "
        );
      } catch (error) {
        if (error instanceof CmsApiError && error.status === 409) {
          setConflictOpen(true);
          setActionError(
            "伺服器版本已更新；為保護你的修改，本機內容未被覆寫。請重新載入伺服器版本後再決定如何處理。 "
          );
        } else if (
          error instanceof CmsApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          handleCmsAccessLost();
        } else {
          setActionError(friendlyError(error));
        }
      } finally {
        setSaving(null);
      }
    },
    [
      applySavedResponse,
      busy,
      content,
      handleCmsAccessLost,
      revision,
      validateBeforeSave,
    ]
  );

  const handleReloadFromServer = useCallback(async () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        "重新載入會捨棄尚未儲存的本機修改。確定要載入伺服器版本嗎？"
      );
      if (!confirmed) return;
    }
    setConflictOpen(false);
    await fetchSnapshot();
  }, [fetchSnapshot, hasUnsavedChanges]);

  const handleExport = useCallback(() => {
    if (!content) return;
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `solution-site-content-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatusMessage("已下載目前內容備份；下載不會自動儲存到 CMS。 ");
  }, [content]);

  const handleImportFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.currentTarget.value = "";
      if (!file) return;
      setImporting(true);
      setActionError("");
      try {
        const raw = await file.text();
        const parsed: unknown = JSON.parse(raw);
        if (!isValidContent(parsed)) {
          throw new Error("檔案不是可用的 SiteContent 文件，或版本不相容。 ");
        }
        const confirmed = window.confirm(
          hasUnsavedChanges
            ? "匯入會取代目前尚未儲存的本機修改。確定要匯入嗎？"
            : "匯入會取代目前的本機草稿。確定要匯入嗎？"
        );
        if (!confirmed) return;
        setContent(cloneContent(parsed));
        setActionError("");
        setStatusMessage("已匯入本機草稿，請確認內容後按「儲存草稿」。 ");
      } catch (error) {
        setActionError(
          error instanceof SyntaxError
            ? "JSON 格式錯誤，無法匯入。"
            : `匯入失敗：${friendlyError(error)}`
        );
      } finally {
        setImporting(false);
      }
    },
    [hasUnsavedChanges]
  );

  const handleAddPost = useCallback(() => {
    setContent(current =>
      current
        ? {
            ...current,
            posts: [
              ...current.posts,
              {
                id: randomId(),
                slug: "",
                title: "",
                category: "",
                summary: "",
                body: "",
                image: "",
                published: false,
                date: new Date().toISOString().slice(0, 10),
              },
            ],
          }
        : current
    );
    setStatusMessage("已新增空白文章；尚未填寫的文章不會被自動公開。 ");
    setActionError("");
    setActiveTab("posts");
  }, []);

  const handleRemovePost = useCallback((post: BlogPost) => {
    const confirmed = window.confirm(
      `確定要刪除文章「${post.title.trim() || "未命名文章"}」嗎？此操作會在儲存後生效。`
    );
    if (!confirmed) return;
    setContent(current =>
      current
        ? {
            ...current,
            posts: current.posts.filter(item => item.id !== post.id),
          }
        : current
    );
    setStatusMessage("文章已從本機草稿移除；請儲存草稿以套用。 ");
  }, []);

  const previewRouteKey =
    activeTab === "posts" ? "blog" : (currentPage?.page ?? "global");
  const previewPath = PREVIEW_PATHS[previewRouteKey] ?? "/";
  const savedPreviewUrl = `${previewPath}${previewPath.includes("?") ? "&" : "?"}cms-preview=1`;
  const canOpenSavedPreview = Boolean(
    content && !hasUnsavedChanges && !loadError
  );

  return (
    <div className="min-h-screen bg-[#090a09] text-[#f1f4eb]">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0c0b]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-7 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/"
              aria-label="返回網站"
              className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#a9ff44] text-[11px] font-black text-[#0d110a]"
            >
              SC
            </a>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold tracking-[0.2em] text-[#a9ff44]">
                SOLUTION CMS / CONTENT
              </p>
              <p className="truncate text-sm font-semibold text-white/85">
                內容管理工作台
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <CmsAccountControls />
            <span
              className={`inline-flex items-center gap-2 border px-3 py-2 text-[11px] font-semibold ${
                hasUnsavedChanges
                  ? "border-[#f6c453]/45 bg-[#f6c453]/8 text-[#f6d98c]"
                  : "border-[#a9ff44]/35 bg-[#a9ff44]/8 text-[#a9ff44]"
              }`}
              aria-live="polite"
            >
              {hasUnsavedChanges ? "● 有未儲存修改" : "✓ 已同步"}
            </span>
            <button
              type="button"
              onClick={() => void handleSave("draft")}
              disabled={
                activeTab === "users" || busy || !content || Boolean(loadError)
              }
              className="inline-flex items-center gap-2 border border-white/20 px-3.5 py-2.5 text-xs font-bold tracking-[0.08em] text-white/80 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving === "draft" ? (
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              儲存草稿
            </button>
            <button
              type="button"
              onClick={() => void handleSave("publish")}
              disabled={
                activeTab === "users" || busy || !content || Boolean(loadError)
              }
              className="inline-flex items-center gap-2 bg-[#a9ff44] px-3.5 py-2.5 text-xs font-extrabold tracking-[0.08em] text-[#11140b] transition-colors hover:bg-[#c3ff7a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving === "publish" ? (
                <LoaderCircle
                  className="h-4 w-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              發布
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1800px] flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-white/10 bg-[#0d0f0d] lg:min-h-[calc(100vh-65px)] lg:w-[270px] lg:border-r lg:border-b-0">
          <div className="p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-white/35">
                  WORKSPACE
                </p>
                <h1 className="mt-1 text-lg font-bold">內容目錄</h1>
              </div>
              <FileText
                className="h-5 w-5 text-[#a9ff44]/75"
                aria-hidden="true"
              />
            </div>
            <label className="relative block">
              <span className="sr-only">搜尋欄位標籤或 key</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                aria-hidden="true"
              />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                className={`${mutedInputClass} pl-9`}
                placeholder="搜尋標籤或 field key…"
                type="search"
              />
            </label>
          </div>
          <nav
            aria-label="內容頁面"
            className="flex gap-2 overflow-x-auto px-4 pb-4 sm:px-6 lg:block lg:space-y-1 lg:px-3"
          >
            {filteredPages.map(entry => {
              const selected =
                activeTab === "fields" && entry.page === currentPage?.page;
              return (
                <button
                  key={entry.page}
                  type="button"
                  onClick={() => {
                    setActiveTab("fields");
                    setActivePage(entry.page);
                  }}
                  className={`group flex min-w-[145px] items-center gap-3 border px-3 py-3 text-left transition-colors lg:w-full ${
                    selected
                      ? "border-[#a9ff44]/45 bg-[#a9ff44]/10 text-[#a9ff44]"
                      : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/85"
                  }`}
                  aria-current={selected ? "page" : undefined}
                >
                  <entry.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {entry.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-white/35">
                      {entry.fields.length} 個欄位
                    </span>
                  </span>
                  <ChevronRight
                    className="h-3.5 w-3.5 shrink-0 opacity-45"
                    aria-hidden="true"
                  />
                </button>
              );
            })}
            {!filteredPages.length && (
              <p className="px-3 py-4 text-xs text-white/40">
                找不到相符頁面或欄位。
              </p>
            )}
            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={`group flex min-w-[145px] items-center gap-3 border px-3 py-3 text-left transition-colors lg:w-full ${
                activeTab === "posts"
                  ? "border-[#a9ff44]/45 bg-[#a9ff44]/10 text-[#a9ff44]"
                  : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/85"
              }`}
              aria-current={activeTab === "posts" ? "page" : undefined}
            >
              <Newspaper className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">
                  部落格文章
                </span>
                <span className="mt-0.5 block text-[10px] text-white/35">
                  {content?.posts.length ?? 0} 篇文章
                </span>
              </span>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 opacity-45"
                aria-hidden="true"
              />
            </button>
            {isOwner && (
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`group flex min-w-[175px] items-center gap-3 border px-3 py-3 text-left transition-colors lg:w-full ${
                  activeTab === "users"
                    ? "border-[#a9ff44]/45 bg-[#a9ff44]/10 text-[#a9ff44]"
                    : "border-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.03] hover:text-white/85"
                }`}
                aria-current={activeTab === "users" ? "page" : undefined}
              >
                <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    登入權限管理
                  </span>
                  <span className="mt-0.5 block text-[10px] text-white/35">
                    Owner only
                  </span>
                </span>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 opacity-45"
                  aria-hidden="true"
                />
              </button>
            )}
          </nav>
          <div className="border-t border-white/10 p-4 sm:p-6 lg:mt-5">
            <p className="mb-3 text-[10px] font-bold tracking-[0.2em] text-white/35">
              TOOLS
            </p>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={handleExport}
                disabled={!content || busy}
                className="inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2.5 text-xs text-white/65 transition-colors hover:border-[#a9ff44]/60 hover:text-[#a9ff44] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" /> 備份
                JSON
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={!content || busy || importing}
                className="inline-flex items-center justify-center gap-2 border border-white/12 px-3 py-2.5 text-xs text-white/65 transition-colors hover:border-[#a9ff44]/60 hover:text-[#a9ff44] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {importing ? (
                  <LoaderCircle
                    className="h-3.5 w-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                匯入 JSON
              </button>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              onChange={event => void handleImportFile(event)}
              className="sr-only"
              aria-label="匯入 SiteContent JSON 備份"
            />
            <a
              href="/admin/members"
              title="會員 CRM 使用獨立的會員 OAuth 登入，與 CMS 帳戶分開"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-white/12 px-3 py-2.5 text-xs text-white/65 transition-colors hover:border-[#a9ff44]/60 hover:text-[#a9ff44]"
            >
              <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" /> 會員
              CRM（獨立 OAuth 登入）
            </a>
            <a
              href="/"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 border border-white/12 px-3 py-2.5 text-xs text-white/65 transition-colors hover:border-[#a9ff44]/60 hover:text-[#a9ff44]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> 返回網站
            </a>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10">
          {loadingDocument && !content ? (
            <section className="flex min-h-[50vh] items-center justify-center border border-white/10 bg-[#11130f]">
              <div
                className="flex items-center gap-3 text-sm text-white/60"
                role="status"
                aria-live="polite"
              >
                <LoaderCircle
                  className="h-5 w-5 animate-spin text-[#a9ff44]"
                  aria-hidden="true"
                />{" "}
                正在讀取 CMS 文件…
              </div>
            </section>
          ) : loadError && !content ? (
            <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center border border-[#ffb4a9]/20 bg-[#15110f] p-8 text-center">
              <AlertTriangle
                className="h-8 w-8 text-[#ffb4a9]"
                aria-hidden="true"
              />
              <h2 className="mt-5 text-xl font-bold">內容文件讀取失敗</h2>
              <p className="mt-3 text-sm leading-7 text-white/60">
                {loadError}
              </p>
              <button
                type="button"
                onClick={() => void fetchSnapshot()}
                disabled={loadingDocument}
                className="mt-7 inline-flex items-center gap-2 bg-[#a9ff44] px-5 py-3 text-xs font-extrabold tracking-[0.1em] text-[#11140b] disabled:opacity-50"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${loadingDocument ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />{" "}
                重試讀取
              </button>
            </section>
          ) : activeTab === "users" && isOwner ? (
            <CmsUsersPanel />
          ) : content ? (
            <>
              <div className="mb-7 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.22em] text-[#a9ff44]">
                    EDITORIAL CONTROL /{" "}
                    {activeTab === "users"
                      ? "ACCESS"
                      : activeTab === "posts"
                        ? "BLOG"
                        : "FIELDS"}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                    {activeTab === "users"
                      ? "登入權限管理"
                      : activeTab === "posts"
                        ? "部落格文章"
                        : (currentPage?.label ?? "內容欄位")}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/52">
                    {activeTab === "users"
                      ? "管理 CMS 內容管理員帳戶與登入權限。"
                      : activeTab === "posts"
                        ? "管理文章草稿與公開狀態。新增文章會保持未公開，直到你明確勾選並發布。"
                        : "編輯目前頁面的文字、長文、圖片與連結。變更只會留在本機草稿，按下儲存後才送到 CMS。"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                  <span>Revision {revision}</span>
                  <span className="text-white/20">·</span>
                  <span>最近儲存 {formatDateTime(updatedAt)}</span>
                  {publishedAt && (
                    <>
                      <span className="text-white/20">·</span>
                      <span>最近發布 {formatDateTime(publishedAt)}</span>
                    </>
                  )}
                </div>
              </div>

              {(actionError || statusMessage || loadError) && (
                <div
                  className={`mb-6 flex items-start gap-3 border px-4 py-3 text-sm leading-6 ${
                    actionError || loadError
                      ? "border-[#ffb4a9]/30 bg-[#3a1b18]/40 text-[#ffd0c8]"
                      : "border-[#a9ff44]/25 bg-[#a9ff44]/8 text-[#d8ffb3]"
                  }`}
                  role={actionError || loadError ? "alert" : "status"}
                  aria-live="polite"
                >
                  {actionError || loadError ? (
                    <AlertTriangle
                      className="mt-1 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2
                      className="mt-1 h-4 w-4 shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span className="whitespace-pre-line">
                    {actionError || loadError || statusMessage}
                  </span>
                  {loadError && (
                    <button
                      type="button"
                      onClick={() => void fetchSnapshot()}
                      className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-bold underline underline-offset-4"
                    >
                      <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                      重試
                    </button>
                  )}
                </div>
              )}

              {conflictOpen && (
                <section
                  className="mb-6 border border-[#f6c453]/45 bg-[#2e2612]/75 p-4 sm:p-5"
                  role="alert"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className="mt-0.5 h-5 w-5 shrink-0 text-[#f6d98c]"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[#f6e2a8]">
                        偵測到版本衝突
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-white/65">
                        另一位管理員已更新內容。你的未儲存修改仍在本機，沒有被覆寫；請先備份或確認後再載入伺服器版本。
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleReloadFromServer()}
                          disabled={busy}
                          className="inline-flex items-center gap-2 bg-[#f6d98c] px-3.5 py-2.5 text-xs font-extrabold text-[#241b08] disabled:opacity-50"
                        >
                          <RefreshCcw className="h-4 w-4" aria-hidden="true" />{" "}
                          載入伺服器版本
                        </button>
                        <button
                          type="button"
                          onClick={() => setConflictOpen(false)}
                          className="inline-flex items-center gap-2 border border-white/20 px-3.5 py-2.5 text-xs font-bold text-white/75 hover:border-white/45"
                        >
                          <X className="h-4 w-4" aria-hidden="true" /> 繼續編輯
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div
                  className="flex items-center gap-1"
                  role="tablist"
                  aria-label="內容類型"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "fields"}
                    onClick={() => setActiveTab("fields")}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold tracking-[0.08em] transition-colors ${activeTab === "fields" ? "border-[#a9ff44] text-[#a9ff44]" : "border-transparent text-white/45 hover:text-white/80"}`}
                  >
                    <Type className="h-4 w-4" aria-hidden="true" /> 頁面欄位
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "posts"}
                    onClick={() => setActiveTab("posts")}
                    className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-bold tracking-[0.08em] transition-colors ${activeTab === "posts" ? "border-[#a9ff44] text-[#a9ff44]" : "border-transparent text-white/45 hover:text-white/80"}`}
                  >
                    <Newspaper className="h-4 w-4" aria-hidden="true" /> 文章 (
                    {content.posts.length})
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewOpen(true)}
                    className="inline-flex items-center gap-2 border border-white/15 px-3.5 py-2.5 text-xs font-bold text-white/70 transition-colors hover:border-[#a9ff44]/60 hover:text-[#a9ff44]"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" /> 欄位預覽
                  </button>
                  <a
                    href={canOpenSavedPreview ? savedPreviewUrl : undefined}
                    target="_blank"
                    rel="noreferrer"
                    aria-disabled={!canOpenSavedPreview}
                    onClick={event => {
                      if (!canOpenSavedPreview) event.preventDefault();
                    }}
                    className={`inline-flex items-center gap-2 border px-3.5 py-2.5 text-xs font-bold transition-colors ${canOpenSavedPreview ? "border-[#a9ff44]/50 text-[#a9ff44] hover:bg-[#a9ff44]/10" : "cursor-not-allowed border-white/10 text-white/30"}`}
                    title={
                      canOpenSavedPreview
                        ? "在網站預覽已儲存的草稿"
                        : "請先儲存草稿，才能預覽已儲存版本"
                    }
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    預覽已儲存草稿
                  </a>
                </div>
              </div>

              {activeTab === "fields" ? (
                <section aria-labelledby="fields-heading">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <h3 id="fields-heading" className="text-xl font-bold">
                        {currentPage?.label ?? "頁面欄位"}
                      </h3>
                      <p className="mt-1 text-xs text-white/40">
                        頁面 key：{currentPage?.page ?? "—"}
                      </p>
                    </div>
                    <span className="hidden items-center gap-2 text-xs text-white/40 sm:flex">
                      <CloudUpload className="h-4 w-4" aria-hidden="true" />{" "}
                      圖片上傳成功後才更新內容
                    </span>
                  </div>
                  {visibleFields.length ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      {visibleFields.map(field => {
                        const value = content.fields[field.key] ?? "";
                        const isImage = field.type === "image";
                        const isTextarea = field.type === "textarea";
                        const isUrl = field.type === "url";
                        const uploading =
                          uploadingTarget === `field:${field.key}`;
                        const labelMentionsLine = `${field.key} ${field.label}`
                          .toLowerCase()
                          .includes("line");
                        return (
                          <article
                            key={field.key}
                            className={`border border-white/10 bg-[#11130f] p-4 sm:p-5 ${isTextarea ? "xl:col-span-2" : ""}`}
                          >
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div>
                                <label
                                  htmlFor={`field-${field.key}`}
                                  className="block text-sm font-bold text-white/90"
                                >
                                  {field.label}
                                </label>
                                <code className="mt-1 block text-[10px] text-[#a9ff44]/65">
                                  {field.key}
                                </code>
                              </div>
                              <span className="shrink-0 border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-white/35">
                                {field.type}
                              </span>
                            </div>
                            {isImage ? (
                              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                                <div className="space-y-3">
                                  <label
                                    htmlFor={`field-${field.key}`}
                                    className="block text-xs font-semibold text-white/55"
                                  >
                                    圖片 URL（可直接編輯）
                                  </label>
                                  <input
                                    id={`field-${field.key}`}
                                    value={value}
                                    onChange={event =>
                                      updateField(field.key, event.target.value)
                                    }
                                    className={inputClass}
                                    placeholder="https://… 或 /assets/…"
                                    type="text"
                                    inputMode="url"
                                  />
                                  <label
                                    className={`flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 px-3 py-3 text-xs font-bold text-white/65 transition-colors hover:border-[#a9ff44]/65 hover:text-[#a9ff44] ${uploading ? "cursor-wait opacity-60" : ""}`}
                                  >
                                    {uploading ? (
                                      <LoaderCircle
                                        className="h-4 w-4 animate-spin"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <Upload
                                        className="h-4 w-4"
                                        aria-hidden="true"
                                      />
                                    )}
                                    {uploading
                                      ? "上傳中…"
                                      : "選擇圖片上傳（最多 3 MB）"}
                                    <input
                                      type="file"
                                      accept="image/jpeg,image/png,image/webp"
                                      disabled={Boolean(uploadingTarget)}
                                      className="sr-only"
                                      onChange={event => {
                                        const file = event.target.files?.[0];
                                        event.currentTarget.value = "";
                                        if (file)
                                          void handleAssetUpload(
                                            `field:${field.key}`,
                                            file,
                                            url => updateField(field.key, url)
                                          );
                                      }}
                                    />
                                  </label>
                                </div>
                                <ImagePreview src={value} alt={field.label} />
                              </div>
                            ) : isTextarea ? (
                              <textarea
                                id={`field-${field.key}`}
                                value={value}
                                onChange={event =>
                                  updateField(field.key, event.target.value)
                                }
                                className={`${inputClass} min-h-40 resize-y leading-7`}
                                placeholder="輸入內容…"
                              />
                            ) : (
                              <>
                                <input
                                  id={`field-${field.key}`}
                                  value={value}
                                  onChange={event =>
                                    updateField(field.key, event.target.value)
                                  }
                                  className={inputClass}
                                  placeholder={
                                    isUrl ? "https://…" : "輸入內容…"
                                  }
                                  type="text"
                                  inputMode={isUrl ? "url" : undefined}
                                />
                                {isUrl && labelMentionsLine && (
                                  <p className="mt-2 text-xs leading-5 text-white/42">
                                    LINE 連結可使用 `line.me`、`lin.ee` 或
                                    `liff.line.me` 網域；請保留完整 URL。
                                  </p>
                                )}
                              </>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border border-dashed border-white/15 px-6 py-12 text-center text-sm text-white/45">
                      此搜尋沒有相符欄位。
                    </div>
                  )}
                  <div className="mt-6 border border-[#a9ff44]/15 bg-[#a9ff44]/[0.035] p-4 text-xs leading-6 text-white/55">
                    <span className="font-bold text-[#a9ff44]">安全提示：</span>
                    圖片只會在伺服器成功回傳 URL
                    後寫入本機文件；儲存草稿與發布是兩個分開的動作。全站 LINE
                    設定請在「全站設定」頁面編輯。
                  </div>
                </section>
              ) : (
                <section aria-labelledby="posts-heading">
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <h3 id="posts-heading" className="text-xl font-bold">
                        文章資料
                      </h3>
                      <p className="mt-1 text-xs text-white/40">
                        目前共有 {content.posts.length}{" "}
                        篇；不會自動建立任何案例內容。
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPost}
                      disabled={busy}
                      className="inline-flex items-center gap-2 bg-[#a9ff44] px-4 py-3 text-xs font-extrabold text-[#11140b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" /> 新增文章
                    </button>
                  </div>
                  {!content.posts.length ? (
                    <div className="border border-dashed border-white/15 px-6 py-16 text-center">
                      <Newspaper
                        className="mx-auto h-8 w-8 text-white/25"
                        aria-hidden="true"
                      />
                      <h4 className="mt-4 font-bold text-white/75">尚無文章</h4>
                      <p className="mt-2 text-sm text-white/40">
                        按「新增文章」建立空白文章草稿，不會填入虛構客戶案例。
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {content.posts.map((post, index) => {
                        const uploadKey = `post:${post.id}`;
                        const uploading = uploadingTarget === uploadKey;
                        return (
                          <article
                            key={post.id}
                            className="border border-white/10 bg-[#11130f] p-4 sm:p-6"
                          >
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                              <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center bg-white/8 text-xs font-bold text-white/60">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <div>
                                  <h4 className="font-bold">
                                    {post.title.trim() || "未命名文章"}
                                  </h4>
                                  <p className="mt-0.5 text-[10px] text-white/35">
                                    ID：{post.id}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemovePost(post)}
                                disabled={busy}
                                className="inline-flex items-center gap-2 border border-[#ffb4a9]/25 px-3 py-2 text-xs font-bold text-[#ffb4a9] transition-colors hover:border-[#ffb4a9]/60 disabled:opacity-40"
                              >
                                <Trash2
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />{" "}
                                移除文章
                              </button>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <label
                                  htmlFor={`post-title-${post.id}`}
                                  className="mb-2 block text-xs font-semibold text-white/55"
                                >
                                  標題
                                </label>
                                <input
                                  id={`post-title-${post.id}`}
                                  value={post.title}
                                  onChange={event =>
                                    updatePost(
                                      post.id,
                                      "title",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="文章標題"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`post-slug-${post.id}`}
                                  className="mb-2 block text-xs font-semibold text-white/55"
                                >
                                  Slug（需唯一）
                                </label>
                                <input
                                  id={`post-slug-${post.id}`}
                                  value={post.slug}
                                  onChange={event =>
                                    updatePost(
                                      post.id,
                                      "slug",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="article-slug"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`post-category-${post.id}`}
                                  className="mb-2 block text-xs font-semibold text-white/55"
                                >
                                  分類
                                </label>
                                <input
                                  id={`post-category-${post.id}`}
                                  value={post.category}
                                  onChange={event =>
                                    updatePost(
                                      post.id,
                                      "category",
                                      event.target.value
                                    )
                                  }
                                  className={inputClass}
                                  placeholder="分類"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor={`post-date-${post.id}`}
                                  className="mb-2 block text-xs font-semibold text-white/55"
                                >
                                  日期
                                </label>
                                <div className="relative">
                                  <CalendarDays
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
                                    aria-hidden="true"
                                  />
                                  <input
                                    id={`post-date-${post.id}`}
                                    type="date"
                                    value={post.date}
                                    onChange={event =>
                                      updatePost(
                                        post.id,
                                        "date",
                                        event.target.value
                                      )
                                    }
                                    className={`${inputClass} pl-10`}
                                  />
                                </div>
                              </div>
                              <div className="md:col-span-2">
                                <label
                                  htmlFor={`post-summary-${post.id}`}
                                  className="mb-2 block text-xs font-semibold text-white/55"
                                >
                                  摘要
                                </label>
                                <textarea
                                  id={`post-summary-${post.id}`}
                                  value={post.summary}
                                  onChange={event =>
                                    updatePost(
                                      post.id,
                                      "summary",
                                      event.target.value
                                    )
                                  }
                                  className={`${inputClass} min-h-24 resize-y leading-7`}
                                  placeholder="列表與 SEO 摘要…"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label
                                  htmlFor={`post-body-${post.id}`}
                                  className="mb-2 block text-xs font-semibold text-white/55"
                                >
                                  內文
                                </label>
                                <textarea
                                  id={`post-body-${post.id}`}
                                  value={post.body}
                                  onChange={event =>
                                    updatePost(
                                      post.id,
                                      "body",
                                      event.target.value
                                    )
                                  }
                                  className={`${inputClass} min-h-56 resize-y leading-7`}
                                  placeholder="文章內文…"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="mb-2 block text-xs font-semibold text-white/55">
                                  封面圖片
                                </label>
                                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
                                  <div className="space-y-3">
                                    <label
                                      htmlFor={`post-image-${post.id}`}
                                      className="sr-only"
                                    >
                                      封面圖片 URL
                                    </label>
                                    <input
                                      id={`post-image-${post.id}`}
                                      value={post.image}
                                      onChange={event =>
                                        updatePost(
                                          post.id,
                                          "image",
                                          event.target.value
                                        )
                                      }
                                      className={inputClass}
                                      placeholder="https://… 或 /assets/…"
                                    />
                                    <label
                                      className={`flex cursor-pointer items-center justify-center gap-2 border border-dashed border-white/20 px-3 py-3 text-xs font-bold text-white/65 transition-colors hover:border-[#a9ff44]/65 hover:text-[#a9ff44] ${uploading ? "cursor-wait opacity-60" : ""}`}
                                    >
                                      {uploading ? (
                                        <LoaderCircle
                                          className="h-4 w-4 animate-spin"
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <Upload
                                          className="h-4 w-4"
                                          aria-hidden="true"
                                        />
                                      )}
                                      {uploading
                                        ? "上傳中…"
                                        : "上傳封面（最多 3 MB）"}
                                      <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={Boolean(uploadingTarget)}
                                        className="sr-only"
                                        onChange={event => {
                                          const file = event.target.files?.[0];
                                          event.currentTarget.value = "";
                                          if (file)
                                            void handleAssetUpload(
                                              uploadKey,
                                              file,
                                              url =>
                                                updatePost(
                                                  post.id,
                                                  "image",
                                                  url
                                                )
                                            );
                                        }}
                                      />
                                    </label>
                                  </div>
                                  <ImagePreview
                                    src={post.image}
                                    alt={post.title || "文章封面"}
                                  />
                                </div>
                              </div>
                              <label className="flex items-center gap-3 border border-white/10 bg-[#0d0f0d] px-3 py-3 text-sm text-white/75 md:col-span-2">
                                <input
                                  type="checkbox"
                                  checked={post.published}
                                  onChange={event =>
                                    updatePost(
                                      post.id,
                                      "published",
                                      event.target.checked
                                    )
                                  }
                                  className="h-4 w-4 accent-[#a9ff44]"
                                />
                                <span>
                                  <span className="font-bold">
                                    文章公開狀態
                                  </span>
                                  <span className="ml-2 text-xs text-white/40">
                                    勾選後仍需按「發布」才會公開
                                  </span>
                                </span>
                              </label>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </>
          ) : null}
        </main>
      </div>

      {previewOpen && content && (
        <dialog
          ref={previewDialogRef}
          onCancel={() => setPreviewOpen(false)}
          onClose={() => setPreviewOpen(false)}
          className="m-auto max-h-[90vh] w-[min(760px,calc(100%-2rem))] overflow-hidden border border-white/15 bg-[#151713] p-0 text-[#f1f4eb] shadow-2xl backdrop:bg-black/80"
          aria-labelledby="field-preview-title"
        >
          <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] text-[#a9ff44]">
                LOCAL SNAPSHOT
              </p>
              <h2 id="field-preview-title" className="mt-1 text-xl font-bold">
                欄位預覽 · {currentPage?.label ?? "內容"}
              </h2>
              <p className="mt-1 text-xs text-white/40">
                這是目前編輯中的欄位卡片，不是網站前台畫面。
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="border border-white/15 p-2 text-white/55 hover:border-white/40 hover:text-white"
              aria-label="關閉欄位預覽"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="max-h-[calc(90vh-145px)] overflow-y-auto p-5 sm:p-7">
            <div className="grid gap-3 sm:grid-cols-2">
              {(currentPage?.fields ?? []).map(field => {
                const value = content.fields[field.key] ?? "";
                return (
                  <article
                    key={field.key}
                    className={`border border-white/10 bg-[#0d0f0d] p-4 ${field.type === "textarea" || field.type === "image" ? "sm:col-span-2" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xs font-bold text-white/75">
                        {field.label}
                      </h3>
                      <code className="text-[10px] text-white/30">
                        {field.key}
                      </code>
                    </div>
                    {field.type === "image" ? (
                      <div className="mt-3">
                        <ImagePreview src={value} alt={field.label} />
                      </div>
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-white/55">
                        {value || "（未設定）"}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end border-t border-white/10 px-5 py-4 sm:px-7">
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              className="border border-white/20 px-4 py-2.5 text-xs font-bold text-white/75 hover:border-[#a9ff44] hover:text-[#a9ff44]"
            >
              關閉
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}

export default function AdminContent() {
  return (
    <CmsAuthProvider>
      <CmsAccessGate>
        <CmsContentEditor />
      </CmsAccessGate>
    </CmsAuthProvider>
  );
}
