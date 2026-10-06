import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AdminMemberDirectoryError,
  getAdminMemberDirectory,
  getAdminMemberPreviews,
  updateAdminMemberPreview,
  type AdminMember,
  type AdminMemberPreview,
  type AdminMemberDirectory,
} from "@/lib/adminMembers";
import {
  askCrmAssistant,
  type CrmAssistantMessage,
} from "@/lib/adminAssistant";
import { WRAP_LOGO_ASSET_PATH } from "@shared/wrapAssetPaths";
import {
  PARTIAL_WRAP_FINISHES,
  PARTIAL_WRAP_PARTS,
} from "@shared/partialWrapOptions";
import {
  ArrowLeft,
  Bot,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileSpreadsheet,
  ImageOff,
  LockKeyhole,
  LoaderCircle,
  RefreshCcw,
  Search,
  Save,
  Send,
  ShieldCheck,
  Settings2,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  dateStyle: "medium",
  timeStyle: "short",
});

const FOLLOW_UP_STATUS_OPTIONS = [
  ["new", "待跟進"],
  ["contacted", "已聯絡"],
  ["quoted", "已報價"],
  ["booked", "已預約"],
  ["closed", "已結案"],
] as const;

function followUpStatusLabel(status: string) {
  return (
    FOLLOW_UP_STATUS_OPTIONS.find(([value]) => value === status)?.[1] ??
    "待跟進"
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function displayName(member: AdminMember) {
  return member.name?.trim() || "未提供姓名";
}

function displayLoginMethod(method: string | null) {
  const normalized = method?.trim().toLowerCase();
  const labels: Record<string, string> = {
    google: "Google",
    email: "Email",
    apple: "Apple",
    microsoft: "Microsoft",
    github: "GitHub",
  };
  return normalized ? labels[normalized] || normalized : "Manus OAuth";
}

function displayPreviewColor(preview: AdminMemberPreview) {
  const color = preview.catalogColor;
  return color?.nameZh || color?.name || color?.category || preview.pantoneId;
}

function displayPreviewConfiguration(preview: AdminMemberPreview) {
  if (!preview.partialWrapCustomizations.length) return "全車包膜";
  return preview.partialWrapCustomizations
    .map(item => {
      const part =
        PARTIAL_WRAP_PARTS[item.part as keyof typeof PARTIAL_WRAP_PARTS]
          ?.label ??
        item.part ??
        "局部";
      const finish =
        PARTIAL_WRAP_FINISHES[item.finish as keyof typeof PARTIAL_WRAP_FINISHES]
          ?.label ??
        item.finish ??
        "材質";
      return `${part}・${finish}`;
    })
    .join("、");
}

function csvCell(value: string | number | null | undefined) {
  const raw = String(value ?? "");
  const formulaSafe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  const normalized = formulaSafe.replaceAll('"', '""');
  return `"${normalized}"`;
}

function downloadCsv(members: AdminMember[]) {
  const header = [
    "姓名",
    "Email",
    "登入方式",
    "註冊時間",
    "最近登入",
    "AI 預覽總數",
    "曾保存預覽數",
  ];
  const rows = members.map(member => [
    displayName(member),
    member.email || "",
    displayLoginMethod(member.loginMethod),
    formatDate(member.createdAt),
    formatDate(member.lastSignedIn),
    member.previewCount,
    member.savedPreviewCount,
  ]);
  const csv = [header, ...rows]
    .map(row => row.map(csvCell).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `solution-members-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function AdminHeader({ name }: { name: string }) {
  return (
    <header className="border-b border-white/10 bg-[#0b0b0a]/94 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
        <button
          type="button"
          onClick={() => {
            window.location.href = "/member";
          }}
          className="group flex min-w-0 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a9ff44]"
          aria-label="回到會員專區"
        >
          <img
            src={WRAP_LOGO_ASSET_PATH}
            alt="Solution Car Wrap"
            className="h-auto w-[130px] object-contain object-left transition-transform duration-200 group-hover:scale-[1.025] sm:w-[156px]"
          />
          <span className="hidden border-l border-white/20 pl-3 text-[0.58rem] font-semibold tracking-[0.18em] text-[#a9ff44] sm:block">
            ADMIN CRM
          </span>
        </button>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 border border-[#a9ff44]/55 bg-[#a9ff44]/10 px-3 py-2 text-[0.59rem] font-bold tracking-[0.13em] text-[#a9ff44] sm:flex">
            <span className="status-dot !h-1.5 !w-1.5" aria-hidden="true" />
            {name} · 管理員
          </span>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/member";
            }}
            className="flex items-center gap-2 text-[0.65rem] font-bold tracking-[0.13em] text-white/62 transition-colors hover:text-[#a9ff44]"
          >
            <ArrowLeft size={15} /> 會員專區
          </button>
        </div>
      </div>
    </header>
  );
}

function AccessState({
  title,
  copy,
  action,
  secondaryAction,
}: {
  title: string;
  copy: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
}) {
  return (
    <main className="flex min-h-[72vh] items-center justify-center px-5 sm:px-8">
      <section className="w-full max-w-xl border border-white/15 bg-[#11130f] p-7 sm:p-10">
        <LockKeyhole size={28} strokeWidth={1.35} className="text-[#a9ff44]" />
        <p className="mt-8 text-[0.61rem] font-bold tracking-[0.2em] text-[#a9ff44]">
          SOLUTION ADMIN CRM
        </p>
        <h1 className="font-display mt-4 text-5xl uppercase leading-[0.84] tracking-[-0.045em] text-white">
          {title}
        </h1>
        <p className="mt-6 max-w-md text-sm leading-7 text-white/60">{copy}</p>
        {(action || secondaryAction) && (
          <div className="mt-8 flex flex-wrap gap-3">
            {action && (
              <button
                type="button"
                onClick={action.onClick}
                className="flex items-center gap-3 bg-[#a9ff44] px-5 py-3 text-xs font-bold tracking-[0.12em] text-[#10130a] transition-colors hover:bg-white"
              >
                {action.label}
              </button>
            )}
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="border border-white/25 px-5 py-3 text-xs font-bold tracking-[0.12em] text-white/75 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]"
              >
                {secondaryAction.label}
              </button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function AdminMembers() {
  const {
    user,
    loading: authLoading,
    isAuthenticated,
    logout,
    refresh,
  } = useAuth();
  const isAdmin = user?.role === "admin";
  const adminName = user?.name?.trim() || "Solution 管理員";
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [vehicleModelInput, setVehicleModelInput] = useState("");
  const [pantoneInput, setPantoneInput] = useState("");
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");
  const [followUpStatusInput, setFollowUpStatusInput] = useState("");
  const [activeFilters, setActiveFilters] = useState({
    vehicleModel: "",
    pantoneId: "",
    dateFrom: "",
    dateTo: "",
    followUpStatus: "",
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [directory, setDirectory] = useState<AdminMemberDirectory | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState("");
  const [expandedMemberId, setExpandedMemberId] = useState<number | null>(null);
  const [previewsByMember, setPreviewsByMember] = useState<
    Record<number, AdminMemberPreview[]>
  >({});
  const [previewLoadingMemberId, setPreviewLoadingMemberId] = useState<
    number | null
  >(null);
  const [previewError, setPreviewError] = useState("");
  const [previewDrafts, setPreviewDrafts] = useState<
    Record<
      number,
      { followUpStatus: string; adminTags: string; adminNote: string }
    >
  >({});
  const [savingPreviewId, setSavingPreviewId] = useState<number | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const [assistantMessages, setAssistantMessages] = useState<
    CrmAssistantMessage[]
  >([
    {
      role: "assistant",
      content:
        "你好，我是 Solution CRM 小助手。我可以整理會員專案、找出待跟進案件，並提供下一步建議。你可以問我：目前有哪些待報價案件？",
    },
  ]);
  const [assistantActions, setAssistantActions] = useState<
    Array<{ title: string; reason: string }>
  >([]);

  const switchToAdminAccount = async () => {
    try {
      await logout();
    } finally {
      startLogin();
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    setDirectoryLoading(true);
    setDirectoryError("");
    void getAdminMemberDirectory({ search: activeSearch, ...activeFilters })
      .then(result => {
        if (!cancelled) setDirectory(result);
      })
      .catch(error => {
        if (!cancelled) {
          if (
            error instanceof AdminMemberDirectoryError &&
            (error.status === 401 || error.status === 403)
          ) {
            void refresh();
          }
          setDirectoryError(
            error instanceof Error ? error.message : "CRM 資料暫時無法讀取。"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDirectoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeFilters, activeSearch, isAdmin, refreshKey]);

  const members = directory?.members ?? [];
  const summaryCards: Array<{
    label: string;
    value: number | string;
    copy: string;
    Icon: LucideIcon;
  }> = [
    {
      label: "MEMBERS",
      value: directory?.summary.totalMembers ?? "—",
      copy: "總會員數",
      Icon: UsersRound,
    },
    {
      label: "NEW / 7 DAYS",
      value: directory?.summary.newMembersLast7Days ?? "—",
      copy: "最近 7 日新會員",
      Icon: Sparkles,
    },
    {
      label: "ACTIVE / 30 DAYS",
      value: directory?.summary.activeMembersLast30Days ?? "—",
      copy: "最近 30 日登入",
      Icon: ShieldCheck,
    },
    {
      label: "AI PREVIEWS",
      value: directory?.summary.totalPreviews ?? "—",
      copy: "累計生成預覽",
      Icon: FileSpreadsheet,
    },
  ];
  const resultLabel = useMemo(() => {
    if (!directory) return "";
    const hasFilters =
      activeSearch.trim() || Object.values(activeFilters).some(Boolean);
    return hasFilters
      ? `符合目前篩選條件的 ${members.length} 位會員`
      : `目前顯示 ${members.length} 位會員`;
  }, [activeFilters, activeSearch, directory, members.length]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActiveSearch(searchInput.trim());
    setActiveFilters({
      vehicleModel: vehicleModelInput.trim(),
      pantoneId: pantoneInput.trim(),
      dateFrom: dateFromInput,
      dateTo: dateToInput,
      followUpStatus: followUpStatusInput,
    });
  };

  const clearFilters = () => {
    setSearchInput("");
    setActiveSearch("");
    setVehicleModelInput("");
    setPantoneInput("");
    setDateFromInput("");
    setDateToInput("");
    setFollowUpStatusInput("");
    setActiveFilters({
      vehicleModel: "",
      pantoneId: "",
      dateFrom: "",
      dateTo: "",
      followUpStatus: "",
    });
  };

  const handleExport = () => {
    if (members.length === 0) {
      toast.info("目前沒有可匯出的會員資料。");
      return;
    }
    downloadCsv(members);
    toast.success(`已匯出 ${members.length} 位會員的 CSV 檔案。`);
  };

  const toggleMemberPreviews = async (member: AdminMember) => {
    if (expandedMemberId === member.id) {
      setExpandedMemberId(null);
      return;
    }
    setExpandedMemberId(member.id);
    setPreviewError("");
    if (previewsByMember[member.id]) return;
    setPreviewLoadingMemberId(member.id);
    try {
      const result = await getAdminMemberPreviews(member.id);
      setPreviewsByMember(current => ({
        ...current,
        [member.id]: result.items,
      }));
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "會員預覽資料暫時無法讀取。"
      );
    } finally {
      setPreviewLoadingMemberId(null);
    }
  };

  const getPreviewDraft = (preview: AdminMemberPreview) =>
    previewDrafts[preview.id] ?? {
      followUpStatus: preview.followUpStatus,
      adminTags: preview.adminTags.join(", "),
      adminNote: preview.adminNote ?? "",
    };

  const updatePreviewDraft = (
    preview: AdminMemberPreview,
    patch: Partial<ReturnType<typeof getPreviewDraft>>
  ) => {
    setPreviewDrafts(current => ({
      ...current,
      [preview.id]: { ...getPreviewDraft(preview), ...patch },
    }));
  };

  const savePreviewDetails = async (
    memberId: number,
    preview: AdminMemberPreview
  ) => {
    const draft = getPreviewDraft(preview);
    setSavingPreviewId(preview.id);
    try {
      const response = await updateAdminMemberPreview(memberId, preview.id, {
        followUpStatus: draft.followUpStatus as
          | "new"
          | "contacted"
          | "quoted"
          | "booked"
          | "closed",
        adminTags: draft.adminTags
          .split(",")
          .map(tag => tag.trim())
          .filter(Boolean),
        adminNote: draft.adminNote,
      });
      setPreviewsByMember(current => ({
        ...current,
        [memberId]: (current[memberId] ?? []).map(item =>
          item.id === preview.id ? response.item : item
        ),
      }));
      setPreviewDrafts(current => {
        const next = { ...current };
        delete next[preview.id];
        return next;
      });
      toast.success("預覽跟進資料已更新");
    } catch (error) {
      toast.error("預覽跟進資料更新失敗", {
        description: error instanceof Error ? error.message : "請稍後再試。",
      });
    } finally {
      setSavingPreviewId(null);
    }
  };

  const submitAssistantQuestion = async () => {
    const question = assistantInput.trim();
    if (!question || assistantLoading) return;
    const nextMessages: CrmAssistantMessage[] = [
      ...assistantMessages,
      { role: "user", content: question },
    ];
    setAssistantMessages(nextMessages);
    setAssistantInput("");
    setAssistantError("");
    setAssistantActions([]);
    setAssistantLoading(true);
    try {
      const response = await askCrmAssistant(nextMessages);
      setAssistantMessages(current => [
        ...current,
        { role: "assistant", content: response.answer },
      ]);
      setAssistantActions(
        Array.isArray(response.suggestedActions)
          ? response.suggestedActions.slice(0, 4)
          : []
      );
    } catch (error) {
      setAssistantError(
        error instanceof Error
          ? error.message
          : "CRM AI 助手暫時無法回應，請稍後再試。"
      );
    } finally {
      setAssistantLoading(false);
    }
  };

  const assistantQuickPrompts = [
    "請列出目前所有待報價案件，並依跟進優先順序排列。",
    "請找出超過 7 天沒有更新的會員專案。",
    "請整理目前 CRM 中最值得今天聯絡的 3 位會員與原因。",
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0a] text-[#f3f4ee]">
      {authLoading ? (
        <AccessState title="VERIFYING" copy="正在確認管理員登入狀態…" />
      ) : !isAuthenticated ? (
        <AccessState
          title="SIGN IN REQUIRED"
          copy="請使用已被設定為 Solution 管理員的帳戶登入後，再查看會員 CRM。"
          action={{ label: "登入管理員帳戶", onClick: startLogin }}
        />
      ) : !isAdmin ? (
        <AccessState
          title="ACCESS RESTRICTED"
          copy="你的帳戶已登入，但沒有會員 CRM 的管理權限。若你需要使用後台，請改用網站管理員帳戶登入。"
          action={{
            label: "回到會員專區",
            onClick: () => {
              window.location.href = "/member";
            },
          }}
          secondaryAction={{
            label: "登出並切換帳戶",
            onClick: () => void switchToAdminAccount(),
          }}
        />
      ) : (
        <>
          <AdminHeader name={adminName} />
          <main>
            <section className="relative overflow-hidden border-b border-white/10 px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
              <div className="hero-scan-grid pointer-events-none absolute inset-0 opacity-25" />
              <div className="relative mx-auto max-w-[1600px]">
                <p className="eyebrow">MEMBER DIRECTORY · ADMIN ONLY</p>
                <div className="mt-5 flex flex-col gap-8 border-b border-white/15 pb-8 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h1 className="font-display text-[clamp(3.4rem,7.2vw,7.8rem)] font-semibold uppercase leading-[0.79] tracking-[-0.055em]">
                      MEMBER
                      <br />
                      <span className="text-white/42">INTELLIGENCE.</span>
                    </h1>
                    <p className="mt-6 max-w-xl text-sm leading-7 text-white/60 sm:text-base">
                      查看會員基本資料、最近登入狀態與 AI
                      車色預覽使用概況。此頁面僅供管理員檢視，不提供會員資料刪除或編輯。
                    </p>
                  </div>
                  <div className="flex items-center gap-3 border-l border-[#a9ff44] bg-[#a9ff44]/6 px-4 py-3 text-sm text-white/65">
                    <ShieldCheck
                      size={19}
                      className="shrink-0 text-[#a9ff44]"
                    />
                    會員資料受管理員 session 保護
                  </div>
                </div>

                <div className="mt-8 grid gap-px border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
                  {summaryCards.map(
                    ({ label, value, copy, Icon: StatIcon }) => {
                      return (
                        <article
                          key={String(label)}
                          className="bg-[#0b0b0a] p-5 sm:p-6"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-[0.6rem] font-bold tracking-[0.15em] text-white/42">
                              {label}
                            </p>
                            <StatIcon
                              size={19}
                              strokeWidth={1.45}
                              className="text-[#a9ff44]"
                            />
                          </div>
                          <p className="font-display mt-8 text-5xl leading-none text-white">
                            {value}
                          </p>
                          <p className="mt-3 text-sm text-white/55">{copy}</p>
                        </article>
                      );
                    }
                  )}
                </div>
                <p className="mt-3 text-xs text-white/38">
                  上方統計為全站累計，不會因下方搜尋條件改變。
                </p>
              </div>
            </section>

            <section className="relative px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
              <div className="grid-lines pointer-events-none absolute inset-0 opacity-25" />
              <div className="relative mx-auto max-w-[1600px]">
                <div className="flex flex-col gap-5 border-b border-white/15 pb-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="eyebrow">CRM / MEMBER RECORDS</p>
                    <h2 className="font-display mt-4 text-[clamp(2.5rem,5.2vw,5.5rem)] font-medium uppercase leading-[0.82] tracking-[-0.048em]">
                      YOUR
                      <br />
                      <span className="text-white/42">MEMBERS.</span>
                    </h2>
                  </div>
                  <p className="max-w-sm text-sm leading-6 text-white/48">
                    搜尋姓名或 Email。為維護載入效能，每次最多顯示並匯出 200
                    位會員。
                  </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <form
                    onSubmit={handleSearch}
                    className="flex w-full max-w-2xl gap-2"
                  >
                    <label className="relative min-w-0 flex-1">
                      <Search
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/42"
                      />
                      <input
                        value={searchInput}
                        onChange={event => setSearchInput(event.target.value)}
                        placeholder="搜尋會員姓名或 Email"
                        className="h-12 w-full border border-white/20 bg-[#11130f] pl-11 pr-4 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#a9ff44]"
                      />
                    </label>
                    <button
                      type="submit"
                      className="bg-[#a9ff44] px-5 text-xs font-bold tracking-[0.12em] text-[#10130a] transition-colors hover:bg-white"
                    >
                      搜尋
                    </button>
                  </form>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRefreshKey(value => value + 1)}
                      disabled={directoryLoading}
                      className="flex items-center gap-2 border border-white/20 px-3 py-3 text-xs font-bold tracking-[0.1em] text-white/70 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:opacity-50"
                    >
                      <RefreshCcw
                        size={14}
                        className={directoryLoading ? "animate-spin" : ""}
                      />
                      更新
                    </button>
                    <button
                      type="button"
                      onClick={handleExport}
                      disabled={directoryLoading || members.length === 0}
                      className="flex items-center gap-2 border border-[#a9ff44]/55 bg-[#a9ff44]/10 px-3 py-3 text-xs font-bold tracking-[0.1em] text-[#a9ff44] transition-colors hover:bg-[#a9ff44] hover:text-[#10130a] disabled:opacity-50"
                    >
                      <Download size={14} /> 匯出目前結果
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 border border-white/10 bg-[#11130f] p-3 sm:grid-cols-2 lg:grid-cols-5">
                  <input
                    value={vehicleModelInput}
                    onChange={event => setVehicleModelInput(event.target.value)}
                    placeholder="車款／車系"
                    className="h-10 border border-white/15 bg-black/20 px-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-[#a9ff44]"
                  />
                  <input
                    value={pantoneInput}
                    onChange={event => setPantoneInput(event.target.value)}
                    placeholder="色號，例如 SRG181"
                    className="h-10 border border-white/15 bg-black/20 px-3 text-xs text-white outline-none placeholder:text-white/35 focus:border-[#a9ff44]"
                  />
                  <label className="flex h-10 items-center gap-2 border border-white/15 bg-black/20 px-3 text-[0.63rem] text-white/45">
                    <span>從</span>
                    <input
                      type="date"
                      value={dateFromInput}
                      onChange={event => setDateFromInput(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none"
                    />
                  </label>
                  <label className="flex h-10 items-center gap-2 border border-white/15 bg-black/20 px-3 text-[0.63rem] text-white/45">
                    <span>至</span>
                    <input
                      type="date"
                      value={dateToInput}
                      onChange={event => setDateToInput(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none"
                    />
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={followUpStatusInput}
                      onChange={event =>
                        setFollowUpStatusInput(event.target.value)
                      }
                      className="h-10 min-w-0 flex-1 border border-white/15 bg-black/20 px-3 text-xs text-white outline-none focus:border-[#a9ff44]"
                    >
                      <option value="" className="bg-[#10110e]">
                        全部跟進狀態
                      </option>
                      {FOLLOW_UP_STATUS_OPTIONS.map(([value, label]) => (
                        <option
                          key={value}
                          value={value}
                          className="bg-[#10110e]"
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="border border-white/20 px-3 text-[0.62rem] font-bold text-white/55 hover:border-[#a9ff44] hover:text-[#a9ff44]"
                    >
                      清除
                    </button>
                  </div>
                </div>

                {directoryError ? (
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-l-2 border-amber-300 bg-amber-300/10 px-4 py-4 text-sm text-amber-50">
                    <span>{directoryError}</span>
                    <button
                      type="button"
                      onClick={() => setRefreshKey(value => value + 1)}
                      className="border border-amber-200/55 px-3 py-2 text-xs font-bold tracking-[0.1em] transition-colors hover:bg-amber-100 hover:text-black"
                    >
                      再試一次
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 overflow-hidden border border-white/15 bg-[#11130f]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 text-xs text-white/48">
                      <span>
                        {directoryLoading ? "正在讀取會員資料…" : resultLabel}
                      </span>
                      <span>管理員限定 · 不顯示會員 openId</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-[1160px] w-full border-collapse text-left">
                        <thead className="bg-black/20 text-[0.58rem] font-bold tracking-[0.14em] text-white/42">
                          <tr>
                            <th className="px-5 py-4">會員</th>
                            <th className="px-4 py-4">登入方式</th>
                            <th className="px-4 py-4">註冊時間</th>
                            <th className="px-4 py-4">最近登入</th>
                            <th className="px-4 py-4 text-right">AI 預覽</th>
                            <th className="px-5 py-4 text-right">曾保存</th>
                            <th className="px-5 py-4 text-right">查看內容</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/8 text-sm">
                          {directoryLoading && !directory ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-5 py-12 text-center text-white/52"
                              >
                                正在讀取會員 CRM…
                              </td>
                            </tr>
                          ) : members.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-5 py-12 text-center text-white/52"
                              >
                                {activeSearch
                                  ? "找不到符合搜尋條件的會員。"
                                  : "目前尚未有會員資料。"}
                              </td>
                            </tr>
                          ) : (
                            members.map(member => (
                              <Fragment key={member.id}>
                                <tr className="transition-colors hover:bg-white/[0.025]">
                                  <td className="px-5 py-4">
                                    <p className="font-semibold text-white">
                                      {displayName(member)}
                                    </p>
                                    <p className="mt-1 text-xs text-white/48">
                                      {member.email || "未提供 Email"}
                                    </p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span className="border border-white/15 px-2 py-1 text-[0.62rem] font-bold tracking-[0.08em] text-white/62">
                                      {displayLoginMethod(member.loginMethod)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-4 text-xs text-white/60">
                                    {formatDate(member.createdAt)}
                                  </td>
                                  <td className="px-4 py-4 text-xs text-white/60">
                                    {formatDate(member.lastSignedIn)}
                                  </td>
                                  <td className="px-4 py-4 text-right font-display text-2xl text-white">
                                    {member.previewCount}
                                  </td>
                                  <td className="px-5 py-4 text-right font-display text-2xl text-[#a9ff44]">
                                    {member.savedPreviewCount}
                                  </td>
                                  <td className="px-5 py-4 text-right">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void toggleMemberPreviews(member)
                                      }
                                      className="inline-flex items-center gap-2 border border-[#a9ff44]/45 bg-[#a9ff44]/8 px-3 py-2 text-xs font-bold tracking-[0.08em] text-[#a9ff44] transition-colors hover:bg-[#a9ff44] hover:text-[#10130a]"
                                    >
                                      {previewLoadingMemberId === member.id ? (
                                        <RefreshCcw
                                          size={13}
                                          className="animate-spin"
                                        />
                                      ) : expandedMemberId === member.id ? (
                                        <ChevronUp size={13} />
                                      ) : (
                                        <ChevronDown size={13} />
                                      )}
                                      {expandedMemberId === member.id
                                        ? "收起"
                                        : "查看預覽"}
                                    </button>
                                  </td>
                                </tr>
                                {expandedMemberId === member.id && (
                                  <tr>
                                    <td
                                      colSpan={7}
                                      className="border-t border-[#a9ff44]/20 bg-[#0b0d0a] px-5 py-6"
                                    >
                                      {previewLoadingMemberId === member.id ? (
                                        <p className="text-sm text-white/55">
                                          正在載入這位會員的預覽圖與配置…
                                        </p>
                                      ) : previewError ? (
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-amber-300 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
                                          <span>{previewError}</span>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setPreviewsByMember(current => {
                                                const next = { ...current };
                                                delete next[member.id];
                                                return next;
                                              });
                                              setPreviewError("");
                                              void toggleMemberPreviews(member);
                                            }}
                                            className="border border-amber-200/50 px-3 py-2 text-xs font-bold"
                                          >
                                            再試一次
                                          </button>
                                        </div>
                                      ) : (previewsByMember[member.id] ?? [])
                                          .length === 0 ? (
                                        <div className="flex items-center gap-3 text-sm text-white/50">
                                          <ImageOff
                                            size={20}
                                            className="text-white/35"
                                          />
                                          這位會員目前沒有已保存的 AI 預覽。
                                        </div>
                                      ) : (
                                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                          {(
                                            previewsByMember[member.id] ?? []
                                          ).map(preview => (
                                            <article
                                              key={preview.id}
                                              className="overflow-hidden border border-white/12 bg-[#11130f]"
                                            >
                                              <div className="grid grid-cols-2 gap-px bg-white/10">
                                                <div className="relative aspect-[4/3] bg-black/30">
                                                  {preview.originalImageUrl ? (
                                                    <img
                                                      src={
                                                        preview.originalImageUrl
                                                      }
                                                      alt={`${displayName(member)} 原始車照`}
                                                      className="h-full w-full object-cover"
                                                      loading="lazy"
                                                    />
                                                  ) : (
                                                    <div className="flex h-full items-center justify-center text-white/30">
                                                      <ImageOff size={22} />
                                                    </div>
                                                  )}
                                                  <span className="absolute left-2 top-2 bg-black/70 px-2 py-1 text-[0.55rem] font-bold tracking-[0.1em] text-white/75">
                                                    原始車照
                                                  </span>
                                                </div>
                                                <div className="relative aspect-[4/3] bg-black/30">
                                                  <img
                                                    src={preview.previewUrl}
                                                    alt={`${displayName(member)} ${preview.pantoneId} 預覽`}
                                                    className="h-full w-full object-cover"
                                                    loading="lazy"
                                                  />
                                                  <span className="absolute left-2 top-2 bg-[#a9ff44] px-2 py-1 text-[0.55rem] font-bold tracking-[0.1em] text-[#10130a]">
                                                    AI 預覽
                                                  </span>
                                                </div>
                                              </div>
                                              <div className="space-y-3 p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                  <div>
                                                    <p className="text-[0.58rem] font-bold tracking-[0.14em] text-[#a9ff44]">
                                                      COLOR / CONFIGURATION
                                                    </p>
                                                    <p className="mt-2 font-display text-2xl text-white">
                                                      {preview.pantoneId}
                                                    </p>
                                                    <p className="mt-1 text-sm text-white/70">
                                                      {displayPreviewColor(
                                                        preview
                                                      )}
                                                    </p>
                                                    {preview.catalogColor && (
                                                      <p className="mt-1 text-xs text-white/42">
                                                        {
                                                          preview.catalogColor
                                                            .category
                                                        }{" "}
                                                        ·{" "}
                                                        {
                                                          preview.catalogColor
                                                            .categoryEn
                                                        }
                                                      </p>
                                                    )}
                                                    {preview.vehicleModel && (
                                                      <p className="mt-2 text-xs text-white/55">
                                                        車款：
                                                        {preview.vehicleModel}
                                                      </p>
                                                    )}
                                                    <div className="mt-3 border-l-2 border-[#a9ff44]/65 bg-[#a9ff44]/6 px-3 py-2">
                                                      <p className="text-[0.58rem] font-bold tracking-[0.12em] text-[#a9ff44]">
                                                        AI VEHICLE
                                                        IDENTIFICATION
                                                      </p>
                                                      <p className="mt-1 text-sm text-white/85">
                                                        {preview.vehicleModelAi ??
                                                          "待人工確認／無法可靠辨識"}
                                                      </p>
                                                      <p className="mt-1 text-[0.62rem] text-white/45">
                                                        {preview.vehicleModelAiSource ===
                                                        "ai"
                                                          ? "AI 高信心辨識"
                                                          : "AI 輔助結果，請人工覆核"}{" "}
                                                        · 信心{" "}
                                                        {
                                                          preview.vehicleModelAiConfidence
                                                        }
                                                        %
                                                      </p>
                                                      {preview
                                                        .vehicleModelAiCandidates
                                                        .length > 0 &&
                                                        preview.vehicleModelAiSource !==
                                                          "ai" && (
                                                          <p className="mt-1 text-[0.62rem] leading-5 text-white/42">
                                                            候選：
                                                            {preview.vehicleModelAiCandidates
                                                              .map(
                                                                candidate =>
                                                                  `${candidate.label}（${candidate.confidence}%）`
                                                              )
                                                              .join("、")}
                                                          </p>
                                                        )}
                                                    </div>
                                                  </div>
                                                  {preview.catalogColor
                                                    ?.swatch && (
                                                    <span
                                                      className="h-9 w-9 shrink-0 border border-white/20"
                                                      style={{
                                                        backgroundColor:
                                                          preview.catalogColor
                                                            .swatch,
                                                      }}
                                                      title="型錄近似色"
                                                    />
                                                  )}
                                                </div>
                                                <div className="space-y-2 border-t border-white/10 pt-3">
                                                  <label className="block text-[0.58rem] font-bold tracking-[0.12em] text-white/45">
                                                    跟進狀態
                                                  </label>
                                                  <select
                                                    value={
                                                      getPreviewDraft(preview)
                                                        .followUpStatus
                                                    }
                                                    onChange={event =>
                                                      updatePreviewDraft(
                                                        preview,
                                                        {
                                                          followUpStatus:
                                                            event.target.value,
                                                        }
                                                      )
                                                    }
                                                    className="h-9 w-full border border-white/15 bg-black/20 px-2 text-xs text-white outline-none focus:border-[#a9ff44]"
                                                  >
                                                    {FOLLOW_UP_STATUS_OPTIONS.map(
                                                      ([value, label]) => (
                                                        <option
                                                          key={value}
                                                          value={value}
                                                          className="bg-[#10110e]"
                                                        >
                                                          {label}
                                                        </option>
                                                      )
                                                    )}
                                                  </select>
                                                  <p className="text-[0.6rem] text-white/38">
                                                    目前：
                                                    {followUpStatusLabel(
                                                      getPreviewDraft(preview)
                                                        .followUpStatus
                                                    )}
                                                  </p>
                                                </div>
                                                <div className="space-y-2 border-t border-white/10 pt-3">
                                                  <label className="block text-[0.58rem] font-bold tracking-[0.12em] text-white/45">
                                                    標籤（逗號分隔）
                                                  </label>
                                                  <input
                                                    value={
                                                      getPreviewDraft(preview)
                                                        .adminTags
                                                    }
                                                    onChange={event =>
                                                      updatePreviewDraft(
                                                        preview,
                                                        {
                                                          adminTags:
                                                            event.target.value,
                                                        }
                                                      )
                                                    }
                                                    placeholder="例如：高意向, Taycan, 待報價"
                                                    className="h-9 w-full border border-white/15 bg-black/20 px-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-[#a9ff44]"
                                                  />
                                                  <label className="block text-[0.58rem] font-bold tracking-[0.12em] text-white/45">
                                                    管理員備註
                                                  </label>
                                                  <textarea
                                                    value={
                                                      getPreviewDraft(preview)
                                                        .adminNote
                                                    }
                                                    onChange={event =>
                                                      updatePreviewDraft(
                                                        preview,
                                                        {
                                                          adminNote:
                                                            event.target.value,
                                                        }
                                                      )
                                                    }
                                                    placeholder="記錄客戶需求、預算或聯絡結果"
                                                    rows={3}
                                                    className="w-full resize-y border border-white/15 bg-black/20 px-2 py-2 text-xs leading-5 text-white outline-none placeholder:text-white/25 focus:border-[#a9ff44]"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      void savePreviewDetails(
                                                        member.id,
                                                        preview
                                                      )
                                                    }
                                                    disabled={
                                                      savingPreviewId ===
                                                      preview.id
                                                    }
                                                    className="inline-flex items-center gap-2 bg-[#a9ff44] px-3 py-2 text-[0.62rem] font-bold text-[#10130a] hover:bg-white disabled:opacity-50"
                                                  >
                                                    <Save size={13} />{" "}
                                                    {savingPreviewId ===
                                                    preview.id
                                                      ? "保存中…"
                                                      : "保存跟進資料"}
                                                  </button>
                                                </div>
                                                <div className="border-t border-white/10 pt-3">
                                                  <div className="flex items-start gap-2 text-xs leading-5 text-white/65">
                                                    <Settings2
                                                      size={14}
                                                      className="mt-0.5 shrink-0 text-[#a9ff44]"
                                                    />
                                                    <span>
                                                      {displayPreviewConfiguration(
                                                        preview
                                                      )}
                                                    </span>
                                                  </div>
                                                  <p className="mt-2 text-xs text-white/42">
                                                    {formatDate(
                                                      preview.createdAt
                                                    )}{" "}
                                                    ·{" "}
                                                    {preview.outputSize ||
                                                      preview.aspectRatio}
                                                  </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2 border-t border-white/10 pt-3">
                                                  <a
                                                    href={preview.previewUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1 border border-white/20 px-2 py-1.5 text-[0.62rem] font-bold text-white/65 hover:border-[#a9ff44] hover:text-[#a9ff44]"
                                                  >
                                                    <ExternalLink size={12} />
                                                    開啟生成圖
                                                  </a>
                                                  {preview.originalImageUrl && (
                                                    <a
                                                      href={
                                                        preview.originalImageUrl
                                                      }
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="inline-flex items-center gap-1 border border-white/20 px-2 py-1.5 text-[0.62rem] font-bold text-white/65 hover:border-[#a9ff44] hover:text-[#a9ff44]"
                                                    >
                                                      <ExternalLink size={12} />
                                                      開啟原圖
                                                    </a>
                                                  )}
                                                </div>
                                              </div>
                                            </article>
                                          ))}
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </main>
          <div className="fixed bottom-5 right-5 z-50 sm:bottom-7 sm:right-7">
            {assistantOpen ? (
              <section className="w-[min(430px,calc(100vw-2rem))] overflow-hidden border border-[#a9ff44]/35 bg-[#11130f] shadow-[0_20px_70px_rgba(0,0,0,0.55)]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#a9ff44] px-4 py-3 text-[#10130a]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10130a] text-[#a9ff44]">
                      <Bot size={17} />
                    </span>
                    <div>
                      <p className="text-sm font-bold tracking-[0.08em]">
                        CRM 小助手
                      </p>
                      <p className="mt-0.5 text-[0.58rem] font-semibold tracking-[0.12em] text-[#10130a]/65">
                        READ-ONLY ANALYSIS · ADMIN ONLY
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssistantOpen(false)}
                    className="border border-[#10130a]/25 px-2 py-1 text-xs font-bold transition-colors hover:bg-white"
                    aria-label="收起 CRM AI 小助手"
                  >
                    收起
                  </button>
                </div>
                <div className="max-h-[min(430px,55vh)] space-y-3 overflow-y-auto px-4 py-4">
                  {assistantMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={
                        message.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      <div
                        className={
                          message.role === "user"
                            ? "max-w-[88%] bg-[#a9ff44] px-3 py-2 text-sm leading-6 text-[#10130a]"
                            : "max-w-[92%] border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-white/78"
                        }
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                  {assistantLoading && (
                    <div className="flex items-center gap-2 text-xs text-white/45">
                      <LoaderCircle
                        size={14}
                        className="animate-spin text-[#a9ff44]"
                      />
                      正在整理會員與專案資料…
                    </div>
                  )}
                  {assistantError && (
                    <div className="border-l-2 border-amber-300 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50">
                      {assistantError}
                    </div>
                  )}
                  {assistantActions.length > 0 && (
                    <div className="border-t border-white/10 pt-3">
                      <p className="text-[0.58rem] font-bold tracking-[0.13em] text-[#a9ff44]">
                        AI 建議下一步（請手動執行）
                      </p>
                      <div className="mt-2 space-y-2">
                        {assistantActions.map((action, index) => (
                          <div
                            key={`${action.title}-${index}`}
                            className="border border-white/10 bg-black/15 px-3 py-2"
                          >
                            <p className="text-xs font-semibold text-white/80">
                              {action.title}
                            </p>
                            <p className="mt-1 text-[0.68rem] leading-5 text-white/45">
                              {action.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="border-t border-white/10 px-4 py-3">
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {assistantQuickPrompts.map(prompt => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setAssistantInput(prompt)}
                        className="shrink-0 border border-white/15 px-2 py-1.5 text-[0.62rem] text-white/55 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]"
                      >
                        {prompt.replace("請", "").replace("。", "")}
                      </button>
                    ))}
                  </div>
                  <form
                    onSubmit={event => {
                      event.preventDefault();
                      void submitAssistantQuestion();
                    }}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={assistantInput}
                      onChange={event => setAssistantInput(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void submitAssistantQuestion();
                        }
                      }}
                      placeholder="輸入問題，Enter 送出…"
                      rows={2}
                      maxLength={2000}
                      className="min-h-12 flex-1 resize-none border border-white/15 bg-black/25 px-3 py-2 text-sm leading-5 text-white outline-none placeholder:text-white/30 focus:border-[#a9ff44]"
                    />
                    <button
                      type="submit"
                      disabled={assistantLoading || !assistantInput.trim()}
                      className="flex h-12 w-12 shrink-0 items-center justify-center bg-[#a9ff44] text-[#10130a] transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="送出問題"
                    >
                      <Send size={16} />
                    </button>
                  </form>
                  <p className="mt-2 text-[0.6rem] leading-5 text-white/35">
                    AI 僅讀取 CRM
                    快照並提供建議，不會自動修改會員資料或發送訊息。
                  </p>
                </div>
              </section>
            ) : (
              <button
                type="button"
                onClick={() => setAssistantOpen(true)}
                className="flex items-center gap-3 rounded-full border border-[#a9ff44]/55 bg-[#11130f] px-4 py-3 text-sm font-bold text-[#a9ff44] shadow-[0_12px_45px_rgba(0,0,0,0.45)] transition-colors hover:bg-[#a9ff44] hover:text-[#10130a]"
              >
                <Bot size={18} />
                CRM AI 小助手
              </button>
            )}
          </div>
          <footer className="border-t border-white/10 bg-[#090909] px-5 py-5 sm:px-8 lg:px-10">
            <div className="mx-auto flex max-w-[1600px] flex-col gap-2 text-[0.6rem] font-medium tracking-[0.13em] text-white/35 sm:flex-row sm:items-center sm:justify-between">
              <span>© 2026 SOLUTION AUTOMOTIVE STUDIO</span>
              <span>ADMIN CRM · PROTECTED MEMBER DATA</span>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
