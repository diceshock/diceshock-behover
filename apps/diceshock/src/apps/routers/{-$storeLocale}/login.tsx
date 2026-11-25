import { useApolloClient } from "@apollo/client";
import { signIn } from "@hono/auth-js/react";
import { createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import WechatQREmbed from "@/client/components/diceshock/WechatQREmbed";
import {
  CaptchaSettingsDocument,
  WechatOpenConfigDocument,
} from "@/client/graphql/__generated__";
import { DASH_ROLES } from "@/shared/constants";

export const Route = createFileRoute("/{-$storeLocale}/login")({
  component: LoginPage,
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AliyunCaptchaConfig {
  SceneId: string;
  prefix: string;
  mode: "popup" | "embed";
  element?: string;
  button?: string;
  captchaVerifyCallback: (
    captchaVerifyParam: string,
  ) => Promise<{ captchaResult: boolean; bizResult: boolean }>;
  onBizResultCallback: (bizResult: boolean) => void;
  getInstance?: (instance: AliyunCaptchaInstance) => void;
  slideStyle?: { width: number; height: number };
  language?: string;
}

interface AliyunCaptchaInstance {
  show?: () => void;
  hide?: () => void;
  refresh?: () => void;
  destroy?: () => void;
}

declare global {
  interface Window {
    initAliyunCaptcha?: (
      config: AliyunCaptchaConfig,
    ) => Promise<AliyunCaptchaInstance | void>;
  }
}

type TabKey = "password" | "qr" | "wechat";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isWechatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

async function redirectAfterSignIn() {
  const response = await fetch("/api/auth/session");
  const session = (await response.json()) as { user?: { role?: string } };
  window.location.replace(
    session.user?.role === "host" ? "/trpg-host" : "/dash",
  );
}

function LoginPage() {
  const client = useApolloClient();
  const [activeTab, setActiveTab] = useState<TabKey>("password");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [hasWechat, setHasWechat] = useState<boolean | null>(null);

  // Redirect if already authenticated with a dash role
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json() as Promise<{ user?: { role?: string } }>)
      .then((session) => {
        const role = session?.user?.role;
        if (role && DASH_ROLES.has(role)) {
          window.location.replace(role === "host" ? "/trpg-host" : "/dash");
          return;
        }
        setSessionChecked(true);
      })
      .catch(() => {
        setSessionChecked(true);
      });
  }, []);

  // Check WeChat availability to decide whether to show the tab
  useEffect(() => {
    client
      .query({ query: WechatOpenConfigDocument })
      .then(({ data }) => {
        setHasWechat(Boolean(data.wechatOpenConfig.appId));
      })
      .catch(() => {
        setHasWechat(false);
      });
  }, [client]);

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "password", label: "账号密码" },
    { key: "qr", label: "小程序扫码" },
    ...(hasWechat ? [{ key: "wechat" as const, label: "微信登录" }] : []),
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title justify-center text-xl mb-4">
            骰子奇兵 · 后台管理
          </h2>

          {/* Tabs */}
          <div role="tablist" className="tabs tabs-bordered mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                className={`tab ${activeTab === tab.key ? "tab-active" : ""}`}
                aria-selected={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "password" && <PasswordTab />}
          {activeTab === "qr" && <QRScanTab />}
          {activeTab === "wechat" && hasWechat && <WechatTab />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1: Password Login
// ---------------------------------------------------------------------------

function PasswordTab() {
  const client = useApolloClient();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // CAPTCHA settings
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaPrefix, setCaptchaPrefix] = useState("1bqoki");
  const [captchaSceneId, setCaptchaSceneId] = useState("1iwji8e9");
  const captchaInstanceRef = useRef<AliyunCaptchaInstance | null>(null);

  // Refs for CAPTCHA callbacks to read latest form values
  const accountRef = useRef(account);
  accountRef.current = account;
  const passwordRef = useRef(password);
  passwordRef.current = password;

  // Load captcha settings
  useEffect(() => {
    client
      .query({ query: CaptchaSettingsDocument })
      .then(({ data }) => {
        setCaptchaEnabled(data.captchaSettings.enabled);
        if (data.captchaSettings.prefix)
          setCaptchaPrefix(data.captchaSettings.prefix);
        if (data.captchaSettings.sceneId)
          setCaptchaSceneId(data.captchaSettings.sceneId);
      })
      .catch(() => {});
  }, [client]);

  // Initialize Aliyun CAPTCHA in popup mode — binds to the login button
  useEffect(() => {
    if (!captchaEnabled || !import.meta.env.PROD) return;
    if (!window.initAliyunCaptcha) return;

    let destroyed = false;
    let retryTimer: number | undefined;
    let retryCount = 0;

    function tryInit() {
      if (destroyed) return;

      const buttonEl = document.querySelector("#admin-login-btn");
      const containerEl = document.querySelector("#captcha-container");
      if (!buttonEl || !containerEl) {
        retryCount++;
        if (retryCount < 20) {
          retryTimer = window.setTimeout(tryInit, 100);
        }
        return;
      }

      void window.initAliyunCaptcha!({
        SceneId: captchaSceneId,
        prefix: captchaPrefix,
        mode: "popup",
        element: "#captcha-container",
        button: "#admin-login-btn",
        captchaVerifyCallback: async (captchaVerifyParam) => {
          if (destroyed) return { captchaResult: false, bizResult: false };

          setSubmitting(true);
          setError(null);

          const currentAccount = accountRef.current.trim();
          const currentPassword = passwordRef.current;

          if (!currentAccount || !currentPassword) {
            setError("请输入账号和密码");
            setSubmitting(false);
            return { captchaResult: true, bizResult: false };
          }

          try {
            const result = await signIn("admin-password", {
              account: currentAccount,
              password: currentPassword,
              botcheck: captchaVerifyParam,
              redirect: false,
            });
            const ok =
              result && typeof result === "object" && "ok" in result
                ? Boolean(result.ok)
                : false;
            return { captchaResult: true, bizResult: ok };
          } catch {
            setError("网络异常，请稍后重试");
            return { captchaResult: true, bizResult: false };
          }
        },
        onBizResultCallback: (bizResult) => {
          setSubmitting(false);
          if (bizResult) {
            void redirectAfterSignIn();
          } else {
            setError((prev) => prev ?? "账号或密码错误");
          }
        },
        getInstance: (inst) => {
          if (!destroyed) captchaInstanceRef.current = inst;
        },
        slideStyle: { width: 360, height: 40 },
        language: "cn",
      });
    }

    tryInit();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (captchaInstanceRef.current?.destroy) {
        captchaInstanceRef.current.destroy();
        captchaInstanceRef.current = null;
      }
    };
  }, [captchaEnabled, captchaPrefix, captchaSceneId]);

  // Direct submit (no CAPTCHA — dev mode or disabled)
  const handleDirectSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const currentAccount = account.trim();
      if (!currentAccount || !password) {
        setError("请输入账号和密码");
        return;
      }

      setSubmitting(true);
      setError(null);

      try {
        const result = await signIn("admin-password", {
          account: currentAccount,
          password,
          redirect: false,
        });
        const ok =
          result && typeof result === "object" && "ok" in result
            ? Boolean(result.ok)
            : false;
        if (ok) {
          void redirectAfterSignIn();
        } else {
          setError("账号或密码错误");
        }
      } catch {
        setError("网络异常，请稍后重试");
      } finally {
        setSubmitting(false);
      }
    },
    [account, password],
  );

  // When CAPTCHA is active the SDK intercepts the button click, so we don't
  // attach onSubmit. When CAPTCHA is off we use a normal form submit.
  const useCaptcha = captchaEnabled && import.meta.env.PROD;

  return (
    <form
      onSubmit={useCaptcha ? (e) => e.preventDefault() : handleDirectSubmit}
    >
      <fieldset disabled={submitting} className="flex flex-col gap-3">
        <label className="input input-bordered flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4 opacity-70"
          >
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM12.735 14c.618 0 1.093-.561.872-1.139a6.002 6.002 0 0 0-11.215 0c-.22.578.254 1.139.872 1.139h9.47Z" />
          </svg>
          <input
            type="text"
            className="grow"
            placeholder="手机号或 UID"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="input input-bordered flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="h-4 w-4 opacity-70"
          >
            <path
              fillRule="evenodd"
              d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="password"
            className="grow"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && <div className="text-error text-sm text-center">{error}</div>}

        <div id="captcha-container" />

        <button
          id="admin-login-btn"
          type="submit"
          className="btn btn-primary w-full"
        >
          {submitting ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            "登录"
          )}
        </button>
      </fieldset>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Tab 2: QR Scan Login
// ---------------------------------------------------------------------------

type QRState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "showing"; qrId: string; dataUrl: string; expiresAt: number }
  | { phase: "confirmed"; qrId: string; confirmToken: string }
  | { phase: "exchanging" }
  | { phase: "done" }
  | { phase: "expired" }
  | { phase: "error"; message: string };

function QRScanTab() {
  const [state, setState] = useState<QRState>({ phase: "idle" });
  const pollRef = useRef<number | null>(null);

  const clearPoll = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const createQR = useCallback(async () => {
    clearPoll();
    setState({ phase: "loading" });

    try {
      const res = await fetch("/api/qr-login/create", { method: "POST" });
      if (!res.ok) throw new Error("Failed to create QR session");
      const data = (await res.json()) as {
        qrId: string;
        code: string;
        expiresIn: number;
      };
      const dataUrl = await QRCode.toDataURL(data.code, {
        width: 256,
        margin: 2,
      });
      const expiresAt = Date.now() + data.expiresIn * 1000;
      setState({
        phase: "showing",
        qrId: data.qrId,
        dataUrl,
        expiresAt,
      });
    } catch {
      setState({ phase: "error", message: "创建二维码失败，请重试" });
    }
  }, [clearPoll]);

  // Start polling when QR is showing
  const qrDataRef = useRef<{ qrId: string; expiresAt: number } | null>(null);
  useEffect(() => {
    if (state.phase === "showing") {
      qrDataRef.current = { qrId: state.qrId, expiresAt: state.expiresAt };
    }
  }, [state]);

  useEffect(() => {
    if (state.phase !== "showing") return;

    pollRef.current = window.setInterval(async () => {
      const data = qrDataRef.current;
      if (!data) return;

      if (Date.now() >= data.expiresAt) {
        clearPoll();
        setState({ phase: "expired" });
        return;
      }

      try {
        const res = await fetch(
          `/api/qr-login/status?qrId=${encodeURIComponent(data.qrId)}`,
        );
        if (!res.ok) return;
        const result = (await res.json()) as {
          status: "pending" | "confirmed" | "expired";
          userId?: string;
          confirmToken?: string;
        };

        if (result.status === "confirmed" && result.confirmToken) {
          clearPoll();
          setState({
            phase: "confirmed",
            qrId: data.qrId,
            confirmToken: result.confirmToken,
          });
        } else if (result.status === "expired") {
          clearPoll();
          setState({ phase: "expired" });
        }
      } catch {
        // Swallow transient network errors — keep polling
      }
    }, 2000);

    return clearPoll;
  }, [state.phase, clearPoll]);

  // Exchange confirmToken for session
  const confirmDataRef = useRef<{ qrId: string; confirmToken: string } | null>(
    null,
  );
  useEffect(() => {
    if (state.phase === "confirmed") {
      confirmDataRef.current = {
        qrId: state.qrId,
        confirmToken: state.confirmToken,
      };
    }
  }, [state]);

  useEffect(() => {
    if (state.phase !== "confirmed") return;
    const data = confirmDataRef.current;
    if (!data) return;
    setState({ phase: "exchanging" });

    let cancelled = false;
    fetch("/api/qr-login/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Exchange failed");
        return res.json() as Promise<{ ok: boolean }>;
      })
      .then((result) => {
        if (cancelled) return;
        if (result.ok) {
          setState({ phase: "done" });
          void redirectAfterSignIn();
        } else {
          setState({ phase: "error", message: "登录确认失败，请重试" });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState({ phase: "error", message: "登录确认失败，请重试" });
      });

    return () => {
      cancelled = true;
    };
  }, [state.phase]);

  // Create QR on first render
  useEffect(() => {
    if (state.phase === "idle") {
      void createQR();
    }
  }, [state.phase, createQR]);

  // Cleanup on unmount
  useEffect(() => clearPoll, [clearPoll]);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {(state.phase === "loading" || state.phase === "idle") && (
        <div className="flex items-center justify-center h-64 w-64">
          <span className="loading loading-spinner loading-lg" />
        </div>
      )}

      {state.phase === "showing" && (
        <img
          src={state.dataUrl}
          alt="扫码登录二维码"
          className="w-64 h-64 rounded-lg"
        />
      )}

      {state.phase === "confirmed" || state.phase === "exchanging" ? (
        <div className="flex flex-col items-center gap-2 h-64 justify-center">
          <span className="loading loading-spinner loading-lg text-success" />
          <p className="text-sm text-success">扫码成功，正在登录…</p>
        </div>
      ) : null}

      {state.phase === "done" && (
        <div className="flex flex-col items-center gap-2 h-64 justify-center">
          <p className="text-sm text-success">登录成功，正在跳转…</p>
        </div>
      )}

      {state.phase === "expired" && (
        <div className="flex flex-col items-center gap-3 h-64 justify-center">
          <p className="text-sm text-base-content/60">二维码已过期</p>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => void createQR()}
          >
            刷新二维码
          </button>
        </div>
      )}

      {state.phase === "error" && (
        <div className="flex flex-col items-center gap-3 h-64 justify-center">
          <p className="text-sm text-error">{state.message}</p>
          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => void createQR()}
          >
            重试
          </button>
        </div>
      )}

      <p className="text-xs text-base-content/60 text-center max-w-xs">
        打开骰子奇兵小程序 → 个人中心 → 扫码登录电脑后台
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3: WeChat Login
// ---------------------------------------------------------------------------

function WechatTab() {
  const inWechat = isWechatBrowser();

  if (inWechat) {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-sm text-base-content/70 text-center">
          点击下方按钮使用微信账号登录
        </p>
        <button
          type="button"
          className="btn btn-success gap-2"
          onClick={() => void signIn("wechat-open")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05a6.13 6.13 0 0 1-.247-1.722c0-3.58 3.357-6.484 7.496-6.484.259 0 .508.025.764.042C16.862 4.442 13.123 2.188 8.691 2.188zm-2.32 4.59c-.578 0-1.047-.47-1.047-1.048s.47-1.048 1.047-1.048 1.047.47 1.047 1.048-.47 1.048-1.047 1.048zm5.37 0c-.578 0-1.047-.47-1.047-1.048s.47-1.048 1.047-1.048 1.048.47 1.048 1.048-.47 1.048-1.048 1.048zm4.51 2.835c-3.675 0-6.66 2.548-6.66 5.69 0 3.14 2.985 5.689 6.66 5.689a7.926 7.926 0 0 0 2.222-.32.676.676 0 0 1 .56.077l1.49.87a.254.254 0 0 0 .13.042.23.23 0 0 0 .227-.23c0-.056-.023-.112-.038-.166l-.305-1.161a.46.46 0 0 1 .166-.52C22.927 18.588 24 16.834 24 14.902c0-3.14-2.985-5.689-6.66-5.689h-.089zm-2.627 3.382c.452 0 .819.368.819.82s-.367.82-.819.82a.82.82 0 0 1-.819-.82c0-.452.367-.82.819-.82zm5.254 0c.452 0 .819.368.819.82s-.367.82-.819.82a.82.82 0 0 1-.82-.82c0-.452.368-.82.82-.82z" />
          </svg>
          微信登录
        </button>
      </div>
    );
  }

  return (
    <WechatQREmbed
      onFallback={() => {
        // If wechat config is unavailable, this won't render — parent already
        // hides the tab. This is a safety fallback.
      }}
    />
  );
}
