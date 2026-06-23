import { WarningIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useCallback, useState } from "react";
import Modal from "@/client/components/modal";
import {
  type UserInfoUpdateResult,
  useUpdateMyUserInfoMutation,
} from "@/client/graphql/__generated__";
import { useMessages } from "@/client/hooks/useMessages";
import useSmsCode from "@/client/hooks/useSmsCode";
import { useTranslation } from "@/client/hooks/useTranslation";

export interface PhoneBindingPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (result: UserInfoUpdateResult["user"]) => void;
  captchaEnabled?: boolean;
}

export default function PhoneBindingPrompt({
  isOpen,
  onClose,
  onSuccess,
  captchaEnabled = import.meta.env.PROD,
}: PhoneBindingPromptProps) {
  const { t } = useTranslation();
  const messages = useMessages();

  const [phone, setPhone] = useState("");
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);

  const [updateMyUserInfo] = useUpdateMyUserInfoMutation();

  const {
    smsForm,
    dispatchSmsForm,
    error: smsError,
    setError: setSmsError,
    countdown,
    getSmsCode,
    reset: resetSms,
  } = useSmsCode({
    phone,
    containerId: "#phone-captcha-container",
    enabled: captchaEnabled,
  });

  const handleClose = useCallback(() => {
    setPhone("");
    setSmsError(null);
    resetSms();
    onClose();
  }, [onClose, setSmsError, resetSms]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const trimmedPhone = typeof phone === "string" ? phone.trim() : "";
      if (!trimmedPhone) {
        messages.error(t("me.phoneRequired"));
        return;
      }

      if (!smsForm.code || smsForm.code.length !== 6) {
        messages.error(t("me.codeRequired"));
        return;
      }

      setIsLoadingPhone(true);

      try {
        const { data } = await updateMyUserInfo({
          variables: {
            input: { phone: trimmedPhone, code: smsForm.code },
          },
        });

        const result: UserInfoUpdateResult | null =
          data?.updateMyUserInfo ?? null;

        if (result?.success) {
          if (result.user) {
            messages.success(t("me.phoneSuccess"));
            onSuccess?.(result.user);
            handleClose();
          } else {
            messages.error(t("me.updateFailed"));
          }
        } else {
          const errorMessage = result?.message ?? t("me.updateFailed");
          messages.error(errorMessage);
        }
      } catch {
        messages.error(t("me.networkError"));
      } finally {
        setIsLoadingPhone(false);
      }
    },
    [
      phone,
      smsForm.code,
      updateMyUserInfo,
      messages,
      handleClose,
      onSuccess,
      t,
    ],
  );

  return (
    <Modal
      isCloseOnClick
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) handleClose();
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
          onClick={handleClose}
          className="btn btn-sm btn-circle absolute top-4 right-4"
          disabled={isLoadingPhone}
        >
          <XIcon className="size-4" weight="bold" />
        </button>

        <h3 className="text-base font-bold px-7 pb-4 flex items-center gap-1">
          {t("me.changePhone")}
        </h3>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 py-4 px-6 sm:px-12"
        >
          {smsError && (
            <div role="alert" className="alert alert-error alert-soft">
              <WarningIcon className="text-error size-4" />
              <span>{smsError}</span>
            </div>
          )}

          <label className="flex flex-col sm:flex-row gap-2">
            <span className="label text-sm min-w-20">{t("me.phoneLabel")}</span>
            <input
              placeholder={t("me.phonePlaceholder")}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              className="input input-sm flex-1"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setSmsError(null);
              }}
              disabled={isLoadingPhone || countdown > 0}
              autoFocus
            />
          </label>

          <label className="flex flex-col sm:flex-row gap-2">
            <span className="label text-sm min-w-20">
              {t("me.verificationCode")}
            </span>
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                placeholder={t("me.codePlaceholder")}
                className="input input-sm flex-1"
                value={smsForm.code}
                onChange={(e) => {
                  dispatchSmsForm({
                    type: "SET_CODE",
                    payload: e.target.value,
                  });
                  setSmsError(null);
                }}
                maxLength={6}
                disabled={isLoadingPhone}
              />
              <button
                id="sms-code-btn"
                type="button"
                className="btn btn-sm shrink-0"
                onClick={getSmsCode}
                disabled={countdown > 0 || isLoadingPhone}
              >
                {countdown > 0 ? `${countdown}s` : t("me.getCode")}
              </button>
            </div>
          </label>

          {captchaEnabled && (
            <div className="flex justify-center">
              <div id="phone-captcha-container" />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              onClick={handleClose}
              disabled={isLoadingPhone}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={
                isLoadingPhone ||
                !(typeof phone === "string" && phone.trim()) ||
                !smsForm.code ||
                smsForm.code.length !== 6
              }
            >
              {isLoadingPhone ? t("common.saving") : t("common.confirm")}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
