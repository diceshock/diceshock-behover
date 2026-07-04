import { useApolloClient } from "@apollo/client";
import { signIn } from "@hono/auth-js/react";
import { WarningIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WechatIcon from "@/client/assets/svg/wechat.svg?react";
import {
  CaptchaSettingsDocument,
  TransferTempIdentityDocument,
  WechatOpenConfigDocument,
} from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import useSmsCode from "../../../hooks/useSmsCode";
import useTempIdentity from "../../../hooks/useTempIdentity";
import Modal from "../../modal";

function isWechatBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /MicroMessenger/i.test(navigator.userAgent);
}

function WechatQREmbed({ onFallback }: { onFallback: () => void }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  const client = useApolloClient();

  useEffect(() => {
    client
      .query({ query: WechatOpenConfigDocument })
      .then(({ data }) => {
        setAppId(data.wechatOpenConfig.appId);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [client]);

  useEffect(() => {
    if (!appId || !containerRef.current) return;

    const redirectUri = encodeURIComponent(
      `${window.location.origin}/api/auth/callback/wechat-open`,
    );
    const state = `wxlogin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const iframe = document.createElement("iframe");
    iframe.src = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
    iframe.style.width = "300px";
    iframe.style.height = "400px";
    iframe.style.border = "none";
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-top-navigation",
    );

    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(iframe);
  }, [appId, key]);

  useEffect(() => {
    if (!loading && !appId) {
      onFallback();
    }
  }, [loading, appId, onFallback]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!appId) {
    return null;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        className="cursor-pointer rounded-lg overflow-hidden"
        onClick={() => setKey((k) => k + 1)}
        title={t("login.wechatQrRefresh")}
      />
      <p className="text-xs text-base-content/60 text-center">
        {t("login.wechatQrHint")}
      </p>
    </div>
  );
}

export default function LoginDialog({
  isOpen,
  onClose,
  isSeatPage = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  isSeatPage?: boolean;
}) {
  const isInWechat = useMemo(() => isWechatBrowser(), []);
  const { t, locale } = useTranslation();

  const [activeTab, setActiveTab] = useState<"wechat" | "phonenumber">(
    isInWechat ? "phonenumber" : "wechat",
  );

  const [phone, setPhone] = useState("");
  const [creatingTemp, setCreatingTemp] = useState(false);
  const { create: createTempIdentity } = useTempIdentity();

  const [captchaEnabled, setCaptchaEnabled] = useState(true);
  const [captchaPrefix, setCaptchaPrefix] = useState<string | undefined>();
  const [captchaSceneId, setCaptchaSceneId] = useState<string | undefined>();
  const [useQRFallback, setUseQRFallback] = useState(false);
  const client = useApolloClient();

  useEffect(() => {
    client
      .query({ query: CaptchaSettingsDocument })
      .then(({ data }) => {
        setCaptchaEnabled(data.captchaSettings.enabled);
        if (data.captchaSettings.prefix) setCaptchaPrefix(data.captchaSettings.prefix);
        if (data.captchaSettings.sceneId) setCaptchaSceneId(data.captchaSettings.sceneId);
      })
      .catch(() => {});
  }, [client]);

  const {
    smsForm,
    dispatchSmsForm,
    error,
    setError,
    countdown,
    verifying,
    getSmsCode,
    reset: resetSms,
  } = useSmsCode({
    phone,
    containerId: "#captcha-element",
    buttonId: "#login-sms-btn",
    enabled:
      isOpen &&
      activeTab === "phonenumber" &&
      import.meta.env.PROD &&
      captchaEnabled,
    captchaPrefix,
    captchaSceneId,
  });

  useEffect(() => {
    if (!isOpen) {
      setPhone("");
      resetSms();
    }
  }, [isOpen, resetSms]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const result = await signIn("credentials", {
        phone,
        code: smsForm.code,
        redirect: false,
      });

      if (result?.ok) {
        if (isSeatPage) {
          try {
            const stored = localStorage.getItem("diceshock_temp_identity");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed?.tempId) {
                const session = await fetch("/api/auth/session");
                const sessionData = (await session.json()) as {
                  user?: { id?: string };
                };
                const userId = sessionData?.user?.id;
                if (userId) {
                  await client.mutate({
                    mutation: TransferTempIdentityDocument,
                    variables: {
                      tempId: parsed.tempId,
                      userId,
                    },
                  });
                }
                localStorage.removeItem("diceshock_temp_identity");
              }
            }
          } catch (e) { console.error("[LoginDialog] post-login seat claim error", e); }
        }
        return window.location.reload();
      }

      setError(
        `${t("login.loginFailed")}: ${result?.error ?? t("login.unknownError")}`,
      );
      console.error(`Login failed: ${result?.error ?? "unknown"}`);
    },
    [phone, smsForm.code, setError, isSeatPage, client, t],
  );

  const handleWechatLogin = useCallback(() => {
    if (isInWechat) {
      signIn("wechat-mp", { callbackUrl: window.location.href });
      return;
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      const callbackUrl = window.location.href;
      // weixin:// deep link attempts to launch WeChat app
      window.location.href = `weixin://dl/business/?appid=${encodeURIComponent(callbackUrl)}`;
      // Fallback if WeChat not installed — document stays visible
      setTimeout(() => {
        if (!document.hidden) {
          signIn("wechat-open", { callbackUrl });
        }
      }, 2500);
      return;
    }

    signIn("wechat-open", { callbackUrl: window.location.href });
  }, [isInWechat]);

  const handleTempIdentity = useCallback(async () => {
    setCreatingTemp(true);
    try {
      await createTempIdentity();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("login.tempCreateFailed"),
      );
    } finally {
      setCreatingTemp(false);
    }
  }, [createTempIdentity, onClose, setError]);

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 768;

  return (
    <Modal
      isCloseOnClick
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) onClose();
      }}
    >
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-120 min-h-64 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-visible",
          "border border-base-content/30",
        )}
      >
        <button
          onClick={onClose}
          className="btn btn-sm btn-circle absolute top-4 right-4"
        >
          <XIcon className="size-4" weight="bold" />
        </button>

        <h3 className="text-base font-bold px-7 pb-4 flex items-center gap-1">
          {t("login.title")}
        </h3>

        {/* Tab 切换 */}
        <div className="tabs tabs-bordered px-7 mb-2">
          <button
            type="button"
            className={clsx("tab", activeTab === "wechat" && "tab-active")}
            onClick={() => setActiveTab("wechat")}
          >
            {t("login.tabWechat")}
          </button>
          <button
            type="button"
            className={clsx("tab", activeTab === "phonenumber" && "tab-active")}
            onClick={() => setActiveTab("phonenumber")}
          >
            {t("login.tabPhone")}
          </button>
        </div>

        {activeTab === "wechat" && (
          <div className="flex flex-col items-center gap-4 py-4 px-6 sm:px-12">
            {isDesktop && !isInWechat && !useQRFallback && (
              <WechatQREmbed onFallback={() => setUseQRFallback(true)} />
            )}

            <button
              type="button"
              className="btn btn-success gap-2"
              onClick={handleWechatLogin}
            >
              <WechatIcon className="size-5" />
              {t("login.wechatButton")}
            </button>
            <p className="text-xs text-base-content/60 text-center">
              {isInWechat
                ? t("login.wechatAuthPublic")
                : t("login.wechatAuthRedirect")}
            </p>

            {isSeatPage && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleTempIdentity}
                disabled={creatingTemp}
              >
                {creatingTemp ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  t("login.tempUse")
                )}
              </button>
            )}
          </div>
        )}

        {activeTab === "phonenumber" && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 py-4 px-12"
          >
            {error && (
              <div role="alert" className="alert alert-error alert-soft">
                <WarningIcon className="text-error size-4" />
                <span>{error}</span>
              </div>
            )}

            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">
                {t("login.phoneLabel")}
              </span>
              <input
                placeholder={t("login.phonePlaceholder")}
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                name="phone"
                className="input input-sm flex-1"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                disabled={countdown > 0}
              />
            </label>

            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">
                {t("login.codeLabel")}
              </span>
              <input
                type="text"
                placeholder={t("login.codePlaceholder")}
                className="input input-sm flex-1"
                value={smsForm.code}
                onChange={(e) => {
                  dispatchSmsForm({
                    type: "SET_CODE",
                    payload: e.target.value,
                  });
                  setError(null);
                }}
                maxLength={6}
              />

              <button
                id="login-sms-btn"
                type="button"
                className="btn btn-sm w-28"
                onClick={getSmsCode}
                disabled={verifying || countdown > 0}
              >
                {verifying ? (
                  <><span className="loading loading-spinner loading-xs" />验证中</>
                ) : countdown > 0 ? (
                  <><span className="loading loading-ring loading-xs" />{countdown}s</>
                ) : (
                  t("login.getCode")
                )}
              </button>
            </label>

            {import.meta.env.PROD && captchaEnabled && (
              <div className="flex justify-center">
                <div id="captcha-element" />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-sm">
              {t("login.submit")}
            </button>

            {isSeatPage && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleTempIdentity}
                disabled={creatingTemp}
              >
                {creatingTemp ? (
                  <span className="loading loading-spinner loading-xs" />
                ) : (
                  t("login.tempUse")
                )}
              </button>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
}
