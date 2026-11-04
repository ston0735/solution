import {
  changeCmsPassword,
  CmsApiError,
  loginCms,
  logoutCms,
  getCmsSession,
  type CmsPrincipal,
} from "@/lib/cms";
import { validateCmsPasswordChange } from "@/lib/cmsPassword";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { KeyRound, LoaderCircle, LogOut, ShieldCheck } from "lucide-react";

const authInputClass =
  "w-full border border-white/12 bg-[#0e100d] px-3.5 py-3 text-sm text-[#f4f5ed] outline-none transition-colors placeholder:text-white/30 focus:border-[#a9ff44]/70 focus:ring-2 focus:ring-[#a9ff44]/15";
const authButtonClass =
  "inline-flex items-center justify-center gap-2 bg-[#a9ff44] px-5 py-3 text-xs font-extrabold tracking-[0.1em] text-[#11140b] transition-colors hover:bg-[#c3ff7a] disabled:cursor-not-allowed disabled:opacity-45";
const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 border border-white/20 px-4 py-3 text-xs font-bold tracking-[0.08em] text-white/75 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44] disabled:cursor-not-allowed disabled:opacity-45";

const MIN_PASSWORD_LENGTH = 12;

type CmsAuthContextValue = {
  user: CmsPrincipal | null;
  loading: boolean;
  sessionLoading: boolean;
  login: (username: string, password: string) => Promise<CmsPrincipal>;
  logout: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<CmsPrincipal>;
  clearSession: () => void;
};

const CmsAuthContext = createContext<CmsAuthContextValue | undefined>(
  undefined
);

function authErrorMessage(error: unknown, action: "login" | "password") {
  if (error instanceof CmsApiError) {
    if (error.status === 0) return "目前無法連線到 CMS，請確認網路後再試。";
    if (error.status === 401 || error.status === 403) {
      return action === "login"
        ? "帳戶名稱或密碼錯誤，請再試一次。"
        : "目前密碼不正確，或登入狀態已失效。請重新登入後再試。";
    }
    if (error.status === 422 || error.status === 400) {
      return action === "password"
        ? "新密碼未通過安全規則，請確認至少 12 個字元且不與目前密碼相同。"
        : "登入資料格式不正確，請再試一次。";
    }
  }
  return action === "login"
    ? "目前無法登入 CMS，請稍後再試。"
    : "目前無法變更密碼，請稍後再試。";
}

function isSessionLoss(error: unknown) {
  return (
    error instanceof CmsApiError &&
    (error.status === 401 || error.status === 403)
  );
}

export function CmsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CmsPrincipal | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const clearSession = useCallback(() => {
    setUser(null);
    setActionLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    setSessionLoading(true);
    try {
      const response = await getCmsSession();
      setUser(response.user);
      return response.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    setActionLoading(true);
    try {
      const response = await loginCms(username, password);
      setUser(response.user);
      return response.user;
    } catch (error) {
      setUser(null);
      throw new Error(authErrorMessage(error, "login"));
    } finally {
      setActionLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setActionLoading(true);
    try {
      await logoutCms();
    } catch (error) {
      if (!isSessionLoss(error)) throw error;
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      setActionLoading(true);
      try {
        const response = await changeCmsPassword(currentPassword, newPassword);
        setUser(response.user);
        return response.user;
      } catch (error) {
        if (isSessionLoss(error)) {
          // A wrong current password or Origin rejection is not itself a
          // revoked session. Preserve the editor unless the session lookup
          // confirms that this account can no longer access the CMS.
          try {
            const session = await getCmsSession();
            setUser(session.user);
          } catch (sessionError) {
            if (isSessionLoss(sessionError)) clearSession();
          }
        }
        throw new Error(authErrorMessage(error, "password"));
      } finally {
        setActionLoading(false);
      }
    },
    [clearSession]
  );

  const value = useMemo<CmsAuthContextValue>(
    () => ({
      user,
      loading: sessionLoading || actionLoading,
      sessionLoading,
      login,
      logout,
      changePassword,
      clearSession,
    }),
    [
      actionLoading,
      changePassword,
      clearSession,
      login,
      logout,
      sessionLoading,
      user,
    ]
  );

  return (
    <CmsAuthContext.Provider value={value}>{children}</CmsAuthContext.Provider>
  );
}

export function useCmsAuth() {
  const context = useContext(CmsAuthContext);
  if (!context) {
    throw new Error("useCmsAuth must be used within CmsAuthProvider");
  }
  return context;
}

function BrandHeader() {
  return (
    <div className="mb-7 flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center bg-[#a9ff44] text-sm font-black text-[#0d110a]">
        SC
      </span>
      <div>
        <p className="text-[10px] font-bold tracking-[0.22em] text-[#a9ff44]">
          SOLUTION CMS
        </p>
        <p className="text-xs text-white/45">內容管理工作台</p>
      </div>
    </div>
  );
}

function GateShell({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090a09] px-5 text-[#f1f4eb]">
      <section className="w-full max-w-lg border border-white/12 bg-[#121411] p-8 shadow-2xl sm:p-10">
        <BrandHeader />
        {children}
      </section>
    </main>
  );
}

function LoadingState() {
  return (
    <div
      className="flex items-center gap-3 text-white/65"
      role="status"
      aria-live="polite"
    >
      <LoaderCircle
        className="h-5 w-5 animate-spin text-[#a9ff44]"
        aria-hidden="true"
      />
      <span>正在確認 CMS 登入狀態…</span>
    </div>
  );
}

function LoginForm() {
  const { login, loading, sessionLoading } = useCmsAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const disabled = loading || sessionLoading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    setError("");
    try {
      await login(username.trim(), password);
      setPassword("");
    } catch (value) {
      setPassword("");
      setError(
        value instanceof Error
          ? value.message
          : "目前無法登入 CMS，請稍後再試。"
      );
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold">登入內容管理系統</h1>
      <p className="mt-3 text-sm leading-7 text-white/60">
        這是獨立的 CMS 權限入口，與會員 OAuth 登入分開。請輸入 CMS 帳戶資料。
      </p>
      <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label
            htmlFor="cms-login-username"
            className="mb-2 block text-xs font-bold text-white/75"
          >
            帳戶名稱
          </label>
          <input
            id="cms-login-username"
            name="username"
            type="text"
            value={username}
            onChange={event => setUsername(event.target.value)}
            autoComplete="username"
            required
            className={authInputClass}
            disabled={disabled}
          />
        </div>
        <div>
          <label
            htmlFor="cms-login-password"
            className="mb-2 block text-xs font-bold text-white/75"
          >
            密碼
          </label>
          <input
            id="cms-login-password"
            name="password"
            type="password"
            value={password}
            onChange={event => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            className={authInputClass}
            disabled={disabled}
          />
        </div>
        {error && (
          <p
            className="border border-[#ffb4a9]/30 bg-[#3a1b18]/40 px-3 py-3 text-sm leading-6 text-[#ffd0c8]"
            role="alert"
          >
            {error}
          </p>
        )}
        <button
          type="submit"
          className={authButtonClass}
          disabled={disabled || !username.trim() || !password}
        >
          {disabled ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          )}
          {disabled ? "登入中…" : "登入 CMS"}
        </button>
      </form>
    </>
  );
}

export function CmsPasswordChangeForm({
  requiredFirstLogin = false,
  onComplete,
  onCancel,
}: {
  requiredFirstLogin?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}) {
  const { changePassword, loading, sessionLoading } = useCmsAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const disabled = loading || sessionLoading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (disabled) return;
    setError("");
    const validationError = validateCmsPasswordChange(
      currentPassword,
      newPassword,
      confirmPassword
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onComplete?.();
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : "目前無法變更密碼，請稍後再試。"
      );
    }
  };

  return (
    <form className="mt-7 space-y-5" onSubmit={handleSubmit} noValidate>
      {requiredFirstLogin && (
        <p
          className="border-l-2 border-[#a9ff44] bg-[#a9ff44]/8 px-3 py-3 text-sm leading-6 text-[#d8ffb3]"
          role="status"
        >
          首次登入必須先變更密碼，完成後才能使用 CMS。新密碼至少 12
          個字元，且不可與目前密碼相同。
        </p>
      )}
      <div>
        <label
          htmlFor="cms-current-password"
          className="mb-2 block text-xs font-bold text-white/75"
        >
          目前密碼
        </label>
        <input
          id="cms-current-password"
          name="currentPassword"
          type="password"
          value={currentPassword}
          onChange={event => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
          className={authInputClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label
          htmlFor="cms-new-password"
          className="mb-2 block text-xs font-bold text-white/75"
        >
          新密碼（至少 12 個字元）
        </label>
        <input
          id="cms-new-password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={event => setNewPassword(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className={authInputClass}
          disabled={disabled}
        />
      </div>
      <div>
        <label
          htmlFor="cms-confirm-password"
          className="mb-2 block text-xs font-bold text-white/75"
        >
          確認新密碼
        </label>
        <input
          id="cms-confirm-password"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={event => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
          className={authInputClass}
          disabled={disabled}
        />
      </div>
      {error && (
        <p
          className="border border-[#ffb4a9]/30 bg-[#3a1b18]/40 px-3 py-3 text-sm leading-6 text-[#ffd0c8]"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className={authButtonClass}
          disabled={
            disabled || !currentPassword || !newPassword || !confirmPassword
          }
        >
          {disabled && (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {disabled ? "變更中…" : "變更密碼"}
        </button>
        {onCancel && (
          <button
            type="button"
            className={secondaryButtonClass}
            onClick={onCancel}
            disabled={disabled}
          >
            取消
          </button>
        )}
      </div>
    </form>
  );
}

export function CmsAccessGate({ children }: { children: ReactNode }) {
  const { user, sessionLoading } = useCmsAuth();

  if (sessionLoading) {
    return (
      <GateShell>
        <LoadingState />
      </GateShell>
    );
  }

  if (!user) {
    return (
      <GateShell>
        <LoginForm />
      </GateShell>
    );
  }

  if (user.mustChangePassword) {
    return (
      <GateShell>
        <h1 className="text-xl font-bold">完成安全設定</h1>
        <p className="mt-3 text-sm leading-7 text-white/60">
          為保護 CMS，請先設定新的登入密碼。完成後才會載入內容或權限資料。
        </p>
        <CmsPasswordChangeForm requiredFirstLogin />
      </GateShell>
    );
  }

  return <>{children}</>;
}

export function CmsAccountControls() {
  const { user, logout, loading } = useCmsAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  if (!user) return null;
  const roleLabel = user.role === "owner" ? "主權限" : "內容管理員";
  const displayName = user.name?.trim() || user.username;

  const handleLogout = async () => {
    setLogoutError("");
    try {
      await logout();
    } catch {
      setLogoutError("登出目前無法完成，請稍後再試。 ");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <span className="inline-flex max-w-full items-center gap-2 border border-white/10 px-3 py-2 text-xs text-white/65">
        <span
          className="h-1.5 w-1.5 shrink-0 bg-[#a9ff44]"
          aria-hidden="true"
        />
        <span className="truncate">
          {displayName}（{user.username}） · {roleLabel}
        </span>
      </span>
      <button
        type="button"
        onClick={() => setPasswordOpen(open => !open)}
        className={secondaryButtonClass}
        disabled={loading}
      >
        <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
        {passwordOpen ? "關閉密碼" : "修改密碼"}
      </button>
      <button
        type="button"
        onClick={() => void handleLogout()}
        className={secondaryButtonClass}
        disabled={loading}
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden="true" /> 登出
      </button>
      {passwordOpen && (
        <div
          className="basis-full border border-white/10 bg-[#11130f] p-4 sm:max-w-md"
          aria-label="修改自己的 CMS 密碼"
        >
          <CmsPasswordChangeForm
            onComplete={() => setPasswordOpen(false)}
            onCancel={() => setPasswordOpen(false)}
          />
        </div>
      )}
      {logoutError && (
        <p
          className="basis-full text-right text-xs text-[#ffd0c8]"
          role="alert"
        >
          {logoutError}
        </p>
      )}
    </div>
  );
}

export type { CmsPrincipal };
