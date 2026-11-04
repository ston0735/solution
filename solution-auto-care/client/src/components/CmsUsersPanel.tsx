import {
  createCmsUser,
  deleteCmsUser,
  getCmsSession,
  getCmsUsers,
  CmsApiError,
  setCmsUserGoogleEmail,
  setCmsUserEnabled,
  type CmsUserRecord,
} from "@/lib/cms";
import { useCmsAuth } from "@/components/CmsAccessGate";
import {
  Check,
  CircleOff,
  LoaderCircle,
  LockKeyhole,
  Link2,
  Link2Off,
  Plus,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserRound,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

const inputClass =
  "w-full border border-white/12 bg-[#0e100d] px-3.5 py-3 text-sm text-[#f4f5ed] outline-none transition-colors placeholder:text-white/30 focus:border-[#a9ff44]/70 focus:ring-2 focus:ring-[#a9ff44]/15";
const buttonClass =
  "inline-flex items-center justify-center gap-2 border border-white/20 px-3 py-2.5 text-xs font-bold tracking-[0.06em] text-white/75 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:cursor-not-allowed disabled:opacity-45";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 bg-[#a9ff44] px-4 py-3 text-xs font-extrabold tracking-[0.08em] text-[#11140b] transition-colors hover:bg-[#c3ff7a] disabled:cursor-not-allowed disabled:opacity-45";

function formatCreatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function userLabel(user: CmsUserRecord) {
  return user.name?.trim() || user.username;
}

export default function CmsUsersPanel() {
  const { user: currentUser, clearSession } = useCmsAuth();
  const [users, setUsers] = useState<CmsUserRecord[]>([]);
  const [revision, setRevision] = useState("");
  const [loading, setLoading] = useState(true);
  const [mutationLoading, setMutationLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [googleEmailDrafts, setGoogleEmailDrafts] = useState<
    Record<string, string>
  >({});
  const [googleSavingId, setGoogleSavingId] = useState<string | null>(null);

  const confirmSessionLoss = useCallback(
    async (value: unknown) => {
      if (
        !(value instanceof CmsApiError) ||
        (value.status !== 401 && value.status !== 403)
      ) {
        return false;
      }
      try {
        await getCmsSession();
        return false;
      } catch (sessionError) {
        if (
          sessionError instanceof CmsApiError &&
          (sessionError.status === 401 || sessionError.status === 403)
        ) {
          clearSession();
          return true;
        }
        return false;
      }
    },
    [clearSession]
  );

  const loadUsers = useCallback(async () => {
    if (currentUser?.role !== "owner") return;
    setLoading(true);
    setError("");
    try {
      const response = await getCmsUsers();
      setUsers(response.users);
      setRevision(response.revision);
      setGoogleEmailDrafts(
        Object.fromEntries(
          response.users.map(account => [
            String(account.id),
            account.googleEmail?.trim() ?? "",
          ])
        )
      );
    } catch (value) {
      if (await confirmSessionLoss(value)) return;
      setError("CMS 帳戶資料暫時無法載入，請稍後再試。 ");
    } finally {
      setLoading(false);
    }
  }, [confirmSessionLoss, currentUser?.role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  if (currentUser?.role !== "owner") return null;

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedName = name.trim();
    if (!trimmedUsername || initialPassword.length < 12 || mutationLoading) {
      setError("請輸入帳戶名稱，且初始密碼至少需要 12 個字元。 ");
      return;
    }
    setMutationLoading(true);
    setError("");
    setStatus("");
    try {
      await createCmsUser({
        username: trimmedUsername,
        name: trimmedName || undefined,
        password: initialPassword,
        revision,
      });
      setUsername("");
      setName("");
      setInitialPassword("");
      setStatus(
        "內容管理員帳戶已建立；請透過安全方式交付初始密碼，並要求首次登入立即變更。 "
      );
      await loadUsers();
    } catch (value) {
      if (await confirmSessionLoss(value)) return;
      if (value && typeof value === "object" && "status" in value) {
        const statusCode = (value as { status?: unknown }).status;
        if (statusCode === 409) {
          setError("帳戶資料已被其他主權限更新，請重新載入後再試。 ");
        } else if (statusCode === 422 || statusCode === 400) {
          setError(
            "帳戶資料未通過安全規則，請檢查帳戶名稱與至少 12 個字元的初始密碼。 "
          );
        } else {
          setError("內容管理員帳戶建立失敗，請稍後再試。 ");
        }
      } else {
        setError("內容管理員帳戶建立失敗，請稍後再試。 ");
      }
    } finally {
      setMutationLoading(false);
    }
  };

  const handleToggle = async (account: CmsUserRecord) => {
    if (account.role !== "editor" || mutationLoading) return;
    const action = account.enabled ? "停用" : "啟用";
    if (
      !window.confirm(`確定要${action}內容管理員「${userLabel(account)}」嗎？`)
    )
      return;
    setMutationLoading(true);
    setError("");
    setStatus("");
    try {
      await setCmsUserEnabled(account.id, !account.enabled, revision);
      setStatus(`已${action}內容管理員「${userLabel(account)}」。`);
      await loadUsers();
    } catch (value) {
      if (await confirmSessionLoss(value)) return;
      if (value && typeof value === "object" && "status" in value) {
        const statusCode = (value as { status?: unknown }).status;
        setError(
          statusCode === 409
            ? "帳戶資料已被更新，請重新載入後再試。 "
            : `內容管理員${action}失敗，請稍後再試。 `
        );
      } else {
        setError(`內容管理員${action}失敗，請稍後再試。 `);
      }
    } finally {
      setMutationLoading(false);
    }
  };

  const handleRemove = async (account: CmsUserRecord) => {
    if (account.role !== "editor" || mutationLoading) return;
    const confirmed = window.confirm(
      `確定要移除內容管理員「${userLabel(account)}」的 CMS 存取權嗎？目前登入將立即失效；主權限日後可重新啟用。`
    );
    if (!confirmed) return;
    setMutationLoading(true);
    setError("");
    setStatus("");
    try {
      await deleteCmsUser(account.id, revision);
      setStatus(`已移除內容管理員「${userLabel(account)}」的 CMS 存取權。`);
      await loadUsers();
    } catch (value) {
      if (await confirmSessionLoss(value)) return;
      if (value && typeof value === "object" && "status" in value) {
        const statusCode = (value as { status?: unknown }).status;
        setError(
          statusCode === 409
            ? "帳戶資料已被更新，請重新載入後再試。 "
            : "內容管理員移除失敗，請稍後再試。 "
        );
      } else {
        setError("內容管理員移除失敗，請稍後再試。 ");
      }
    } finally {
      setMutationLoading(false);
    }
  };

  const handleGoogleEmail = async (account: CmsUserRecord) => {
    if (mutationLoading || googleSavingId) return;
    const accountId = String(account.id);
    const currentEmail = account.googleEmail?.trim() ?? "";
    const nextEmail = (googleEmailDrafts[accountId] ?? "").trim();
    if (currentEmail === nextEmail) {
      setStatus("Google email 授權沒有變更。 ");
      return;
    }
    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setError("請輸入有效的 Google email，或清空欄位以解除授權。 ");
      setStatus("");
      return;
    }

    if (currentEmail) {
      const action = nextEmail ? "更新" : "解除";
      const detail = nextEmail
        ? `改為「${nextEmail}」`
        : "清除目前核准的 Google email";
      const confirmed = window.confirm(
        `確定要${action}「${userLabel(account)}」的 Google 登入授權，${detail}嗎？這會撤銷該帳戶現有的 Google CMS session；若這是目前主權限自己的 email，完成後可能需要重新登入。`
      );
      if (!confirmed) return;
    }

    setGoogleSavingId(accountId);
    setError("");
    setStatus("");
    try {
      const response = await setCmsUserGoogleEmail(
        account.id,
        nextEmail || null,
        revision
      );
      setUsers(response.users);
      setRevision(response.revision);
      setGoogleEmailDrafts(
        Object.fromEntries(
          response.users.map(item => [
            String(item.id),
            item.googleEmail?.trim() ?? "",
          ])
        )
      );
      setStatus(
        nextEmail
          ? currentEmail
            ? `已更新「${userLabel(account)}」的 Google email 授權。`
            : `已核准「${userLabel(account)}」使用此 Google email；首次登入後才會綁定 Google 身分。`
          : `已解除「${userLabel(account)}」的 Google 登入授權。`
      );
      await loadUsers();
    } catch (value) {
      if (await confirmSessionLoss(value)) return;
      if (value instanceof CmsApiError && value.status === 409) {
        setError("帳戶資料已被更新，已重新載入最新 Google 授權狀態，請再試。 ");
        await loadUsers();
      } else {
        setError("Google email 授權更新失敗，請稍後再試。 ");
      }
    } finally {
      setGoogleSavingId(null);
    }
  };

  return (
    <section className="space-y-6" aria-labelledby="cms-users-heading">
      <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-[#a9ff44]">
            ACCESS CONTROL / OWNER ONLY
          </p>
          <h2
            id="cms-users-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.03em] sm:text-4xl"
          >
            登入權限管理
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/52">
            建立與管理內容管理員帳戶。初始密碼只用於交付，管理員首次登入必須立即變更；本頁不會顯示或保存密碼。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading || mutationLoading}
          className={buttonClass}
        >
          <RefreshCcw
            className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            aria-hidden="true"
          />
          重新載入
        </button>
      </div>

      <form
        onSubmit={handleCreate}
        className="border border-[#a9ff44]/20 bg-[#a9ff44]/[0.035] p-4 sm:p-6"
      >
        <div className="flex items-center gap-3">
          <UserRound className="h-5 w-5 text-[#a9ff44]" aria-hidden="true" />
          <div>
            <h3 className="font-bold text-white/90">新增內容管理員</h3>
            <p className="mt-1 text-xs text-white/45">
              帳戶會以 editor 權限建立，不可使用登入權限管理。
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="cms-new-username"
              className="mb-2 block text-xs font-bold text-white/70"
            >
              帳戶名稱
            </label>
            <input
              id="cms-new-username"
              value={username}
              onChange={event => setUsername(event.target.value)}
              autoComplete="off"
              required
              className={inputClass}
              placeholder="例如 editor01"
              disabled={mutationLoading}
            />
          </div>
          <div>
            <label
              htmlFor="cms-new-name"
              className="mb-2 block text-xs font-bold text-white/70"
            >
              姓名（選填）
            </label>
            <input
              id="cms-new-name"
              value={name}
              onChange={event => setName(event.target.value)}
              autoComplete="off"
              className={inputClass}
              placeholder="內容管理員姓名"
              disabled={mutationLoading}
            />
          </div>
          <div>
            <label
              htmlFor="cms-new-password"
              className="mb-2 block text-xs font-bold text-white/70"
            >
              初始密碼（至少 12 個字元）
            </label>
            <input
              id="cms-new-password"
              value={initialPassword}
              onChange={event => setInitialPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
              className={inputClass}
              placeholder="僅本次輸入"
              disabled={mutationLoading}
            />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-5 text-white/42">
            建立成功後，請不要把初始密碼寫入文件、訊息紀錄或瀏覽器儲存。
          </p>
          <button
            type="submit"
            className={primaryButtonClass}
            disabled={
              mutationLoading || !username.trim() || initialPassword.length < 12
            }
          >
            {mutationLoading ? (
              <LoaderCircle
                className="h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            建立內容管理員
          </button>
        </div>
      </form>

      {(error || status) && (
        <div
          className={`border px-4 py-3 text-sm leading-6 ${error ? "border-[#ffb4a9]/30 bg-[#3a1b18]/40 text-[#ffd0c8]" : "border-[#a9ff44]/25 bg-[#a9ff44]/8 text-[#d8ffb3]"}`}
          role={error ? "alert" : "status"}
        >
          {error || status}
        </div>
      )}

      <div className="overflow-hidden border border-white/10 bg-[#11130f]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div>
            <h3 className="font-bold text-white/90">CMS 帳戶</h3>
            <p className="mt-1 text-xs text-white/42">
              Revision {revision || "—"} · 只有 owner 可見此清單
            </p>
          </div>
          <span className="inline-flex items-center gap-2 border border-[#a9ff44]/25 bg-[#a9ff44]/8 px-3 py-2 text-[11px] font-semibold text-[#a9ff44]">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Owner
            protected
          </span>
        </div>
        {loading && !users.length ? (
          <div
            className="flex items-center justify-center gap-3 px-5 py-14 text-sm text-white/55"
            role="status"
            aria-live="polite"
          >
            <LoaderCircle
              className="h-5 w-5 animate-spin text-[#a9ff44]"
              aria-hidden="true"
            />
            正在讀取 CMS 帳戶…
          </div>
        ) : users.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-white/45">
            目前沒有可顯示的 CMS 帳戶。
          </p>
        ) : (
          <div className="divide-y divide-white/8">
            {users.map(account => {
              const isOwner = account.role === "owner";
              const accountId = String(account.id);
              const currentGoogleEmail = account.googleEmail?.trim() ?? "";
              const googleDraft =
                googleEmailDrafts[accountId] ?? currentGoogleEmail;
              const googleBusy = googleSavingId === accountId;
              return (
                <article
                  key={String(account.id)}
                  className="flex flex-col gap-4 px-4 py-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center ${isOwner ? "bg-[#a9ff44]/15 text-[#a9ff44]" : "bg-white/8 text-white/55"}`}
                    >
                      {isOwner ? (
                        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <UserRound className="h-4 w-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-bold text-white/90">
                          {userLabel(account)}
                        </p>
                        <span className="border border-white/12 px-2 py-1 text-[10px] font-bold tracking-[0.1em] text-white/45">
                          {account.username}
                        </span>
                        <span
                          className={`border px-2 py-1 text-[10px] font-bold tracking-[0.1em] ${isOwner ? "border-[#a9ff44]/35 text-[#a9ff44]" : "border-white/12 text-white/45"}`}
                        >
                          {isOwner ? "OWNER" : "EDITOR"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-white/40">
                        建立於 {formatCreatedAt(account.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 border border-white/10 bg-[#0d0f0d] p-3 sm:p-4 lg:max-w-[540px]">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {currentGoogleEmail ? (
                          <Link2
                            className="h-4 w-4 text-[#a9ff44]"
                            aria-hidden="true"
                          />
                        ) : (
                          <Link2Off
                            className="h-4 w-4 text-white/35"
                            aria-hidden="true"
                          />
                        )}
                        <p className="text-xs font-bold text-white/80">
                          Google 登入授權
                        </p>
                      </div>
                      <span
                        className={`border px-2 py-1 text-[10px] font-bold ${currentGoogleEmail ? (account.googleLinked ? "border-[#a9ff44]/35 text-[#a9ff44]" : "border-[#f6c453]/35 text-[#f6d98c]") : "border-white/12 text-white/40"}`}
                      >
                        {currentGoogleEmail
                          ? account.googleLinked
                            ? "已綁定 Google 身分"
                            : "等待首次 Google 登入"
                          : "未核准"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <label
                        htmlFor={`cms-google-email-${accountId}`}
                        className="sr-only"
                      >
                        {userLabel(account)} 的核准 Google email
                      </label>
                      <input
                        id={`cms-google-email-${accountId}`}
                        type="email"
                        value={googleDraft}
                        onChange={event =>
                          setGoogleEmailDrafts(current => ({
                            ...current,
                            [accountId]: event.target.value,
                          }))
                        }
                        autoComplete="off"
                        placeholder="核准的 Google email"
                        className={`${inputClass} min-w-0 flex-1`}
                        disabled={mutationLoading || Boolean(googleSavingId)}
                      />
                      <button
                        type="button"
                        onClick={() => void handleGoogleEmail(account)}
                        disabled={
                          mutationLoading ||
                          Boolean(googleSavingId) ||
                          googleDraft.trim() === currentGoogleEmail
                        }
                        className={buttonClass}
                      >
                        {googleBusy ? (
                          <LoaderCircle
                            className="h-3.5 w-3.5 animate-spin"
                            aria-hidden="true"
                          />
                        ) : currentGoogleEmail ? (
                          "更新／解除"
                        ) : (
                          "核准 email"
                        )}
                      </button>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-white/40">
                      只允許既有 CMS
                      帳戶使用，不會自動建立帳戶；首次核准可保留現有
                      session。更新或解除會撤銷該帳戶的 Google session。
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {isOwner ? (
                      <span className="inline-flex items-center gap-2 border border-[#a9ff44]/25 bg-[#a9ff44]/8 px-3 py-2 text-xs font-bold text-[#a9ff44]">
                        <LockKeyhole
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />{" "}
                        主帳戶 · 受保護
                      </span>
                    ) : (
                      <>
                        <span
                          className={`inline-flex items-center gap-2 border px-3 py-2 text-xs font-bold ${account.enabled ? "border-[#a9ff44]/25 text-[#a9ff44]" : "border-white/15 text-white/45"}`}
                        >
                          {account.enabled ? (
                            <UserRoundCheck
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          ) : (
                            <UserRoundX
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          )}
                          {account.enabled ? "可登入" : "已停用"}
                        </span>
                        {account.mustChangePassword && (
                          <span className="border border-[#f6c453]/35 bg-[#f6c453]/8 px-3 py-2 text-xs font-bold text-[#f6d98c]">
                            首次登入需改密碼
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleToggle(account)}
                          disabled={mutationLoading}
                          className={buttonClass}
                        >
                          {account.enabled ? (
                            <CircleOff
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          ) : (
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {account.enabled ? "停用" : "啟用"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleRemove(account)}
                          disabled={mutationLoading}
                          className="inline-flex items-center justify-center gap-2 border border-[#ffb4a9]/25 px-3 py-2.5 text-xs font-bold text-[#ffb4a9] transition-colors hover:border-[#ffb4a9]/60 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{" "}
                          移除
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
