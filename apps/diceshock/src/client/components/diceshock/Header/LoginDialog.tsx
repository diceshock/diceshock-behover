import { signIn } from "@hono/auth-js/react";
import { WarningIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import trpcClientPublic from "../../../../shared/utils/trpc";
import useSmsCode from "../../../hooks/useSmsCode";
import useTempIdentity from "../../../hooks/useTempIdentity";
import Modal from "../../modal";

export default function LoginDialog({
  isOpen,
  onClose,
  isSeatPage = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  isSeatPage?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"phonenumber" | "thirdparty">(
    "phonenumber",
  );

  const [phone, setPhone] = useState("");
  const [creatingTemp, setCreatingTemp] = useState(false);
  const { create: createTempIdentity } = useTempIdentity();

  const [captchaEnabled, setCaptchaEnabled] = useState(true);

  useEffect(() => {
    trpcClientPublic.settings.getCaptchaEnabled
      .query()
      .then((res) => setCaptchaEnabled(res.enabled))
      .catch(() => {});
  }, []);

  const {
    smsForm,
    dispatchSmsForm,
    error,
    setError,
    countdown,
    getSmsCode,
    reset: resetSms,
  } = useSmsCode({
    phone,
    containerId: "#turnstileIns-container",
    enabled:
      isOpen &&
      activeTab === "phonenumber" &&
      import.meta.env.PROD &&
      captchaEnabled,
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
                const sessionData: any = await session.json();
                const userId = sessionData?.user?.id;
                if (userId) {
                  await trpcClientPublic.tempIdentity.transfer.mutate({
                    tempId: parsed.tempId,
                    userId,
                  });
                }
                localStorage.removeItem("diceshock_temp_identity");
              }
            }
          } catch {}
        }
        return window.location.reload();
      }

      setError(`登录失败，请稍后重试: ${result?.error ?? "未知错误"}`);
      console.error(`登录失败，请稍后重试: ${result?.error ?? "未知错误"}`);
    },
    [phone, smsForm.code, setError, isSeatPage],
  );

  const handleTempIdentity = useCallback(async () => {
    setCreatingTemp(true);
    try {
      await createTempIdentity();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建临时身份失败");
    } finally {
      setCreatingTemp(false);
    }
  }, [createTempIdentity, onClose, setError]);

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
          登录/注册
        </h3>

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
              <span className="label text-sm min-w-20">手机号:</span>
              <input
                placeholder="用以收发短信验证码"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                name="phone"
                className="input input-sm"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError(null);
                }}
                disabled={countdown > 0}
              />
            </label>

            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">短信验证码:</span>
              <input
                type="text"
                placeholder="六位数字短信验证码"
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
                type="button"
                className="btn btn-sm"
                onClick={getSmsCode}
                disabled={countdown > 0}
              >
                {countdown > 0 ? `${countdown}秒后重试` : "获取验证码"}
              </button>
            </label>

            {import.meta.env.PROD && captchaEnabled && (
              <div className="flex justify-center">
                <div id="turnstileIns-container" />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-sm">
              登录
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
                  "临时使用（无需登录）"
                )}
              </button>
            )}
          </form>
        )}
      </div>
    </Modal>
  );
}
