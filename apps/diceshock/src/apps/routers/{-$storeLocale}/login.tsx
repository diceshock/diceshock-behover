import { signIn } from "@hono/auth-js/react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import QRCode from "qrcode";
import { useCallback, useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/{-$storeLocale}/login")({
  component: AdminLoginPage,
});

type Tab = "password" | "qr";
type QrPhase = "idle" | "loading" | "pending" | "expired" | "error";

/**
 * 后台登录页（/login）。
 *
 * 两种方式：
 *  1. 账号 + 密码：凭据来自 Worker secret（ADMIN_LOGIN_USER / ADMIN_LOGIN_PASSWORD_HASH）；
 *  2. 小程序扫码：网页申请二维码，已登录的小程序扫码确认后自动建立会话。
 * 只有 admin / staff / host 能登录后台，顾客与会员会被拒绝。
 */
function AdminLoginPage() {
  const [tab, setTab] = useState<Tab>("password");
  const [checking, setChecking] = useState(true);

  // 账号密码
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 扫码
  const [qrImage, setQrImage] = useState("");
  const [qrPhase, setQrPhase] = useState<QrPhase>("idle");
  const [qrError, setQrError] = useState("");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/session", { headers: { accept: "application/json" } })
      .then((res) => res.json())
      .then((raw: unknown) => {
        if (cancelled) return;
        const session = raw as { user?: { role?: string } } | null;
        const role = session?.user?.role;
        if (role === "admin" || role === "staff" || role === "host") {
          window.location.replace("/dash");
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        account,
        password,
        redirect: false,
      });
      if (result?.ok) {
        window.location.replace("/dash");
        return;
      }
      setError("账号或密码不正确");
    } catch {
      setError("登录请求失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  const pollQr = useCallback(
    (qrId: string) => {
      stopPolling();
      pollTimer.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/qr-login/status?qrId=${encodeURIComponent(qrId)}`,
          );
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as {
              message?: string;
            } | null;
            stopPolling();
            setQrPhase("error");
            setQrError(data?.message ?? "扫码登录失败，请重试");
            return;
          }
          const data = (await res.json()) as { status: string };
          if (data.status === "confirmed") {
            stopPolling();
            window.location.replace("/dash");
          } else if (data.status === "expired") {
            stopPolling();
            setQrPhase("expired");
          }
        } catch {
          // 网络抖动时继续轮询
        }
      }, 2000);
    },
    [stopPolling],
  );

  const startQr = useCallback(async () => {
    setQrPhase("loading");
    setQrError("");
    setQrImage("");
    try {
      const res = await fetch("/api/qr-login/create", { method: "POST" });
      if (!res.ok) throw new Error("create failed");
      const data = (await res.json()) as { qrId: string; code: string };
      const dataUrl = await QRCode.toDataURL(data.code, {
        width: 240,
        margin: 1,
      });
      setQrImage(dataUrl);
      setQrPhase("pending");
      pollQr(data.qrId);
    } catch {
      setQrPhase("error");
      setQrError("二维码生成失败，请重试");
    }
  }, [pollQr]);

  useEffect(() => {
    if (tab === "qr" && qrPhase === "idle") void startQr();
    if (tab === "password") stopPolling();
  }, [tab, qrPhase, startQr, stopPolling]);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      <main className="flex-1 grid place-items-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-wide">骰子奇兵</h1>
            <p className="text-sm text-base-content/60 mt-2">管理后台登录</p>
            <p className="text-xs text-base-content/40 mt-1">
              仅限管理员、店长、主持人登录
            </p>
          </div>

          <ClientOnly>
            {checking ? (
              <div className="flex justify-center py-10">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : (
              <div className="card bg-base-100 shadow-xl border border-base-300">
                <div role="tablist" className="tabs tabs-boxed m-4 mb-0">
                  <button
                    type="button"
                    role="tab"
                    className={`tab flex-1 ${tab === "password" ? "tab-active" : ""}`}
                    onClick={() => setTab("password")}
                  >
                    账号密码
                  </button>
                  <button
                    type="button"
                    role="tab"
                    className={`tab flex-1 ${tab === "qr" ? "tab-active" : ""}`}
                    onClick={() => setTab("qr")}
                  >
                    小程序扫码
                  </button>
                </div>

                <div className="card-body gap-4">
                  {tab === "password" ? (
                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                      <div>
                        <label
                          htmlFor="admin-account"
                          className="block text-sm font-medium text-base-content/80 mb-2"
                        >
                          账号
                        </label>
                        <input
                          id="admin-account"
                          type="text"
                          className="input input-bordered w-full"
                          value={account}
                          onChange={(e) => setAccount(e.target.value)}
                          autoComplete="username"
                          placeholder="请输入后台账号"
                          required
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="admin-password"
                          className="block text-sm font-medium text-base-content/80 mb-2"
                        >
                          密码
                        </label>
                        <input
                          id="admin-password"
                          type="password"
                          className="input input-bordered w-full"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="current-password"
                          placeholder="请输入密码"
                          required
                        />
                      </div>
                      {error && (
                        <div className="alert alert-error py-2 text-sm">
                          {error}
                        </div>
                      )}
                      <button
                        type="submit"
                        className="btn btn-primary w-full mt-2"
                        disabled={busy}
                      >
                        {busy ? (
                          <span className="loading loading-spinner loading-sm" />
                        ) : (
                          "登录"
                        )}
                      </button>
                    </form>
                  ) : (
                    <div className="flex flex-col items-center gap-3 py-2">
                      {qrPhase === "loading" && (
                        <span className="loading loading-spinner loading-lg py-16" />
                      )}

                      {qrPhase === "pending" && qrImage && (
                        <>
                          <img
                            src={qrImage}
                            alt="小程序扫码登录"
                            className="w-60 h-60 rounded-lg bg-white p-2"
                          />
                          <p className="text-sm text-base-content/70 text-center">
                            用「骰子奇兵」小程序扫码登录
                          </p>
                          <p className="text-xs text-base-content/50 text-center">
                            小程序里打开「我的 → 扫一扫登录」
                          </p>
                          <p className="text-xs text-base-content/40">
                            二维码 5 分钟内有效
                          </p>
                        </>
                      )}

                      {qrPhase === "expired" && (
                        <>
                          <p className="text-sm text-base-content/60 py-10">
                            二维码已过期
                          </p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => void startQr()}
                          >
                            刷新二维码
                          </button>
                        </>
                      )}

                      {qrPhase === "error" && (
                        <>
                          <div className="alert alert-error py-2 text-sm">
                            {qrError}
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => void startQr()}
                          >
                            重试
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </ClientOnly>

          <div className="text-center mt-6">
            <a href="/" className="link link-hover text-xs opacity-60">
              返回网站首页
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
