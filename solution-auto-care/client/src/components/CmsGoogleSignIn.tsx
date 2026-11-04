import {
  CmsApiError,
  getCmsGoogleConfig,
  requestCmsGoogleNonce,
} from "@/lib/cms";
import { LoaderCircle, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleIdentityClient = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    auto_select: false;
    callback: (response: GoogleCredentialResponse) => void;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      text: "signin_with";
      shape: "pill";
      width: number;
      locale: "zh_TW";
    }
  ) => void;
};

type GoogleIdentityNamespace = {
  accounts?: {
    id?: GoogleIdentityClient;
  };
};

type GoogleSetupPhase =
  | "loading"
  | "unconfigured"
  | "ready"
  | "submitting"
  | "error";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const GOOGLE_NONCE_REFRESH_MS = 4 * 60 * 1000;

let googleScriptPromise: Promise<GoogleIdentityClient> | null = null;
let googleConfigPromise: ReturnType<typeof getCmsGoogleConfig> | null = null;
let googleNoncePromise: ReturnType<typeof requestCmsGoogleNonce> | null = null;
let googleNonceFreshUntil = 0;

function getGoogleIdentityClient() {
  if (typeof window === "undefined") return null;
  const browserWindow = window as unknown as {
    google?: GoogleIdentityNamespace;
  };
  return browserWindow.google?.accounts?.id ?? null;
}

function loadGoogleIdentityScript() {
  const existingClient = getGoogleIdentityClient();
  if (existingClient) return Promise.resolve(existingClient);
  if (googleScriptPromise) return googleScriptPromise;

  const promise = new Promise<GoogleIdentityClient>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_SCRIPT_SRC}"]`
    );
    const script = existing ?? document.createElement("script");
    const cleanup = () => {
      clearTimeout(timeout);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
    const handleLoad = () => {
      cleanup();
      const client = getGoogleIdentityClient();
      if (client) resolve(client);
      else reject(new Error("Google Identity Services 未提供登入介面。"));
    };
    const handleError = () => {
      cleanup();
      if (!existing) script.remove();
      reject(new Error("Google Identity Services 載入失敗。"));
    };
    const timeout = setTimeout(handleError, 15_000);
    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });

    if (!existing) {
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  googleScriptPromise = promise;
  void promise.catch(() => {
    if (googleScriptPromise === promise) googleScriptPromise = null;
  });
  return promise;
}

function getSharedGoogleConfig() {
  if (googleConfigPromise) return googleConfigPromise;
  const promise = getCmsGoogleConfig();
  googleConfigPromise = promise;
  void promise.catch(() => {
    if (googleConfigPromise === promise) googleConfigPromise = null;
  });
  return promise;
}

function resetSharedGoogleConfig() {
  googleConfigPromise = null;
}

function getSharedGoogleNonce() {
  if (googleNoncePromise && Date.now() < googleNonceFreshUntil) {
    return googleNoncePromise;
  }
  const promise = requestCmsGoogleNonce();
  googleNoncePromise = promise;
  googleNonceFreshUntil = Date.now() + GOOGLE_NONCE_REFRESH_MS;
  void promise.catch(() => {
    if (googleNoncePromise === promise) resetSharedGoogleNonce();
  });
  return promise;
}

function resetSharedGoogleNonce() {
  googleNoncePromise = null;
  googleNonceFreshUntil = 0;
}

function setupErrorMessage(error: unknown) {
  if (error instanceof CmsApiError) {
    if (error.status === 0) return "目前無法連線到 CMS，請確認網路後再試。";
    if (error.status === 404 || error.status >= 500) {
      return "Google 登入設定服務目前無法使用，請稍後重試；也可以先使用帳密登入。";
    }
    if (error.status === 401 || error.status === 403) {
      return "Google 登入安全檢查目前無法完成，請重新整理後再試；也可以先使用帳密登入。";
    }
  }
  return "Google 登入元件目前無法載入，請重試；若瀏覽器封鎖第三方登入視窗，請允許 Google 登入後再試。";
}

function callbackErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Google 登入失敗，請使用已核准的 Google 帳號重試，或改用 CMS 帳密登入。";
}

export default function CmsGoogleSignIn({
  onCredential,
}: {
  onCredential: (credential: string, flowId: string) => Promise<unknown>;
}) {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const callbackInFlightRef = useRef(false);
  const generationRef = useRef(0);
  const [retryKey, setRetryKey] = useState(0);
  const [phase, setPhase] = useState<GoogleSetupPhase>("loading");
  const [error, setError] = useState("");

  const retry = useCallback(() => {
    if (callbackInFlightRef.current) return;
    resetSharedGoogleConfig();
    resetSharedGoogleNonce();
    setError("");
    setRetryKey(current => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    let renewalTimer: ReturnType<typeof setTimeout> | undefined;
    const generation = ++generationRef.current;
    setPhase("loading");
    setError("");
    buttonContainerRef.current?.replaceChildren();

    const isCurrent = () =>
      active &&
      generationRef.current === generation &&
      Boolean(buttonContainerRef.current);

    const prepare = async () => {
      let config;
      try {
        config = await getSharedGoogleConfig();
      } catch (value) {
        if (!isCurrent()) return;
        const message = setupErrorMessage(value);
        setPhase("error");
        setError(message);
        toast.error("Google 登入設定載入失敗", { description: message });
        return;
      }

      if (!isCurrent()) return;
      if (!config.configured || !config.clientId?.trim()) {
        setPhase("unconfigured");
        return;
      }

      try {
        const { nonce, flowId } = await getSharedGoogleNonce();
        const google = await loadGoogleIdentityScript();
        if (!isCurrent()) return;
        const buttonContainer = buttonContainerRef.current;
        if (!buttonContainer) return;

        buttonContainer.replaceChildren();
        google.initialize({
          client_id: config.clientId,
          nonce,
          auto_select: false,
          callback: response => {
            if (!isCurrent() || callbackInFlightRef.current) return;
            const credential = response.credential?.trim();
            if (!credential) {
              const message = "Google 沒有提供有效登入憑證，請重試。";
              buttonContainerRef.current?.replaceChildren();
              setPhase("error");
              setError(message);
              toast.error("Google 登入失敗", { description: message });
              resetSharedGoogleNonce();
              return;
            }

            callbackInFlightRef.current = true;
            resetSharedGoogleNonce();
            setPhase("submitting");
            void onCredential(credential, flowId)
              .then(() => {
                if (isCurrent()) setPhase("ready");
              })
              .catch(value => {
                if (!isCurrent()) return;
                const message = callbackErrorMessage(value);
                buttonContainerRef.current?.replaceChildren();
                setPhase("error");
                setError(message);
                toast.error("Google 登入失敗", { description: message });
              })
              .finally(() => {
                callbackInFlightRef.current = false;
              });
          },
        });
        google.renderButton(buttonContainer, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "signin_with",
          shape: "pill",
          width: Math.min(
            360,
            Math.max(200, buttonContainer.clientWidth || 360)
          ),
          locale: "zh_TW",
        });
        setPhase("ready");
        renewalTimer = setTimeout(
          () => {
            if (!isCurrent() || callbackInFlightRef.current) return;
            resetSharedGoogleNonce();
            setRetryKey(current => current + 1);
          },
          Math.max(1000, googleNonceFreshUntil - Date.now())
        );
      } catch (value) {
        if (!isCurrent()) return;
        resetSharedGoogleNonce();
        const message = setupErrorMessage(value);
        setPhase("error");
        setError(message);
        toast.error("Google 登入元件載入失敗", { description: message });
      }
    };

    void prepare();
    return () => {
      active = false;
      if (renewalTimer) clearTimeout(renewalTimer);
      if (generationRef.current === generation) generationRef.current += 1;
      buttonContainerRef.current?.replaceChildren();
    };
  }, [onCredential, retryKey]);

  return (
    <section
      className="mt-7 border-t border-white/10 pt-6"
      aria-label="Google 登入"
    >
      <div className="mb-4 flex items-center gap-3 text-[10px] font-bold tracking-[0.2em] text-white/35">
        <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
        <span>或使用 Google 帳號</span>
        <span className="h-px flex-1 bg-white/10" aria-hidden="true" />
      </div>
      <div
        ref={buttonContainerRef}
        className="mx-auto flex min-h-11 max-w-[360px] justify-center"
        aria-live="polite"
      />
      {phase === "loading" && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/45">
          <LoaderCircle
            className="h-3.5 w-3.5 animate-spin"
            aria-hidden="true"
          />
          正在準備 Google 登入…
        </p>
      )}
      {phase === "submitting" && (
        <p className="mt-3 flex items-center justify-center gap-2 text-xs text-white/55">
          <LoaderCircle
            className="h-3.5 w-3.5 animate-spin"
            aria-hidden="true"
          />
          正在確認 Google 帳號…
        </p>
      )}
      {phase === "unconfigured" && (
        <>
          <button
            type="button"
            disabled
            className="mx-auto mt-1 flex w-full max-w-[360px] items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white/40"
          >
            使用 Google 帳號登入
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-white/45">
            尚未完成 Google OAuth 設定，目前請使用帳密登入。
          </p>
        </>
      )}
      {phase === "error" && (
        <div className="mt-3 space-y-3">
          <p
            className="border border-[#ffb4a9]/30 bg-[#3a1b18]/40 px-3 py-3 text-center text-xs leading-5 text-[#ffd0c8]"
            role="alert"
          >
            {error}
          </p>
          <button
            type="button"
            onClick={retry}
            className="mx-auto inline-flex w-full max-w-[360px] items-center justify-center gap-2 border border-white/20 px-4 py-3 text-xs font-bold tracking-[0.08em] text-white/75 transition-colors hover:border-[#a9ff44] hover:text-[#a9ff44]"
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
            重試 Google 登入
          </button>
        </div>
      )}
    </section>
  );
}
