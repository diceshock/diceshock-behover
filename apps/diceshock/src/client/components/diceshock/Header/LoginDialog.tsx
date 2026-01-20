/// <reference types="cloudflare-turnstile" />

import { WarningIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useAtomValue } from "jotai";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { z } from "zod/v4";
import trpcClientPublic from "@/shared/utils/trpc";
import Modal from "../../modal";
import { themeA } from "../../ThemeSwap";

const SITE_KEY = "0x4AAAAAACNaVUPcjZJ2BWv-";

type SmsFormState = {
  botcheck: null | string;
  code: string;
};

type SmsFormAction =
  | { type: "SET_BOTCHECK"; payload: string | null }
  | { type: "SET_CODE"; payload: string }
  | { type: "RESET" };

const smsFormReducer = (
  state: SmsFormState,
  action: SmsFormAction,
): SmsFormState => {
  switch (action.type) {
    case "SET_BOTCHECK":
      return { ...state, botcheck: action.payload };
    case "SET_CODE":
      return { ...state, code: action.payload };
    case "RESET":
      return { botcheck: null, code: "" };
    default:
      return state;
  }
};

const INITIAL_SMS_FORM_STATE: SmsFormState = {
  botcheck: null,
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
  const [countdown, setCountdown] = useState(0);
  const [phone, setPhone] = useState("");

  const turnstileIdRef = useRef<string | null | undefined>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const prevPhoneRef = useRef<string>("");

  const [smsForm, dispatchSmsForm] = useReducer(
    smsFormReducer,
    INITIAL_SMS_FORM_STATE,
  );

  useLayoutEffect(() => {
    if (!turnstile || typeof window === "undefined") return;

    if (!isOpen && turnstileIdRef.current) {
      turnstile.remove(turnstileIdRef.current);
      turnstileIdRef.current = null;
    }

    if (!isOpen) {
      dispatchSmsForm({ type: "RESET" });
      setPhone("");
      setCountdown(0);
      setError(null);
      prevPhoneRef.current = "";
      return;
    }

    turnstileIdRef.current = turnstile.render("#turnstile-container", {
      sitekey: SITE_KEY,
      theme: theme === "dark" ? "dark" : "light",
      size: "normal",
      callback: (token) => {
        dispatchSmsForm({ type: "SET_BOTCHECK", payload: token });
      },
    });
  }, [isOpen, theme]);

  const getSmsCode = useCallback(async () => {
    if (countdown > 0) return;
    if (!smsForm.botcheck) return setError("请先通过人机验证");

    const phoneResult = z
      .string()
      .min(6)
      .max(20)
      .regex(/^[0-9]*$/)
      .safeParse(phone);

    if (!phoneResult.success) return setError("手机号格式错误");

    setError(null);

    try {
      const result = await trpcClientPublic.auth.smsCode.mutate({
        phone,
        botcheck: smsForm.botcheck,
      });

      if (result.success && "code" in result) {
        setCountdown(20);
      } else if (!result.success && "message" in result) {
        setError(result.message);
      } else {
        setError("发送失败，请稍后重试");
      }
    } catch {
      setError("网络错误，请稍后重试");
    }
  }, [phone, smsForm.botcheck, countdown]);

  useEffect(() => {
    if (countdown > 0) {
      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [countdown]);

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
            {error && (
              <div role="alert" className="alert alert-error alert-soft">
                <WarningIcon className="text-error size-4" />
                <span>{error}</span>
              </div>
            )}

            <label className="flex flex-row gap-2">
              <span className="label text-sm min-w-20">手机号:</span>
              <input
                type="text"
                placeholder="用以收发短信验证码"
                className="input input-sm"
                value={phone}
                onChange={(e) => {
                  const newPhone = e.target.value;
                  const phoneChanged = newPhone !== prevPhoneRef.current;

                  // 如果手机号改变，清空 botcheck 和 code，并重置 Turnstile
                  if (phoneChanged && prevPhoneRef.current) {
                    dispatchSmsForm({ type: "RESET" });
                    // 重置 Turnstile widget
                    if (turnstile && turnstileIdRef.current) {
                      turnstile.reset(turnstileIdRef.current);
                    }
                  }

                  setPhone(newPhone);
                  prevPhoneRef.current = newPhone;
                  setError(null);
                }}
                disabled={countdown > 0}
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
            </label>

            <div className="flex justify-center">
              <div id="turnstile-container" />
            </div>

            <button type="submit" className="btn btn-primary btn-sm">
              登录
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
}
