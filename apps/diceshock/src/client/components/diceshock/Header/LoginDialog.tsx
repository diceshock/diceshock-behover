/// <reference types="cloudflare-turnstile" />

import { XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { z } from "zod/v4";
import useImmer from "@/client/hooks/useImmer";
import trpcClientPublic from "@/shared/utils/trpc";
import Modal from "../../modal";
import { themeA } from "../../ThemeSwap";

const SITE_KEY = "0x4AAAAAACNaVUPcjZJ2BWv-";

type SmsForm = {
  botcheck: null | string;
  phone: string;
  code: string;
};

const DEFAULT_SMS_FORM: SmsForm = {
  botcheck: null,
  phone: "",
  code: "",
};

export default function LoginDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const theme = useAtomValue(themeA);

  const [activeTab, setActiveTab] = useState<"phonenumber" | "thirdparty">(
    "phonenumber",
  );

  const [error, setError] = useState<string | null>(null);

  const turnstileIdRef = useRef<string | null | undefined>(null);

  const [smsForm, setSmsForm] = useImmer<SmsForm>(DEFAULT_SMS_FORM);

  useLayoutEffect(() => {
    if (!turnstile || typeof window === "undefined") return;

    if (!isOpen && turnstileIdRef.current)
      turnstile.remove(turnstileIdRef.current);

    if (!isOpen) return;

    turnstileIdRef.current = turnstile.render("#turnstile-container", {
      sitekey: SITE_KEY,
      theme: theme === "dark" ? "dark" : "light",
      size: "normal",
      callback: (token) => {
        setSmsForm((draft) => {
          draft.botcheck = token;
        });
      },
    });
  }, [isOpen, theme, setSmsForm]);

  const getSmsCode = useCallback(async () => {
    if (!smsForm.botcheck) return setError("请先通过人机验证");

    const phoneResult = z
      .string()
      .min(6)
      .max(20)
      .regex(/^[0-9]*$/)
      .safeParse(smsForm.phone);

    if (!phoneResult.success) return setError("手机号格式错误");

    const result = await trpcClientPublic.auth.smsCode.mutate({
      phone: smsForm.phone,
      botcheck: smsForm.botcheck,
    });
  }, [smsForm]);

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

        <div role="tablist" className="tabs tabs-border ml-4">
          <button
            role="tab"
            className={clsx("tab", activeTab === "phonenumber" && "tab-active")}
            onClick={() => setActiveTab("phonenumber")}
          >
            手机登录
          </button>
          <button
            role="tab"
            className={clsx("tab", activeTab === "thirdparty" && "tab-active")}
            onClick={() => setActiveTab("thirdparty")}
          >
            第三方登录
          </button>
        </div>

        {activeTab === "phonenumber" && (
          <form className="flex flex-col gap-4 py-4 px-12">
            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">手机号:</span>
              <input
                type="text"
                placeholder="用以收发短信验证码"
                className="input input-sm"
              />

              <button type="button" className="btn btn-sm">
                获取验证码
              </button>
            </label>

            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">短信验证码:</span>
              <input
                type="text"
                placeholder="六位数字短信验证码"
                className="input input-sm flex-1"
              />
            </label>

            <div className="flex justify-center">
              <div id="turnstile-container" />
            </div>

            {error && (
              <div className="text-error text-sm my-4 px-4">{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-sm">
              登录
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
