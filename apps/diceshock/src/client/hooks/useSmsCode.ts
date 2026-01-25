/// <reference types="cloudflare-turnstile" />

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
import { themeA } from "@/client/components/ThemeSwap";
import trpcClientPublic from "@/shared/utils/trpc";

const SITE_KEY = "0x4AAAAAACNaVUPcjZJ2BWv-";

const turnstileIns: typeof turnstile | null =
  (globalThis as any).turnstile ?? null;

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

export default function useSmsCode({
  phone,
  containerId = "#turnstileIns-container",
  enabled = true,
}: {
  phone: string;
  containerId?: string;
  enabled?: boolean;
}) {
  const theme = useAtomValue(themeA);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const turnstileIdRef = useRef<string | null | undefined>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const prevPhoneRef = useRef<string>("");

  const [smsForm, dispatchSmsForm] = useReducer(
    smsFormReducer,
    INITIAL_SMS_FORM_STATE,
  );

  const reset = useCallback(() => {
    dispatchSmsForm({ type: "RESET" });
    setCountdown(0);
    setError(null);
    prevPhoneRef.current = "";
    if (turnstileIns && turnstileIdRef.current) {
      turnstileIns.reset(turnstileIdRef.current);
    }
  }, []);

  useLayoutEffect(() => {
    if (!turnstileIns || typeof window === "undefined") return;

    if (!enabled) {
      if (turnstileIdRef.current) {
        turnstileIns.remove(turnstileIdRef.current);
        turnstileIdRef.current = null;
      }
      dispatchSmsForm({ type: "RESET" });
      setCountdown(0);
      setError(null);
      prevPhoneRef.current = "";
      return;
    }

    // 检查容器是否存在
    const container = document.querySelector(containerId);
    if (!container) return;

    // 如果已经渲染过，先移除
    if (turnstileIdRef.current) {
      turnstileIns.remove(turnstileIdRef.current);
      turnstileIdRef.current = null;
    }

    // 渲染新的 turnstile
    turnstileIdRef.current = turnstileIns.render(containerId, {
      sitekey: SITE_KEY,
      theme: theme === "dark" ? "dark" : "light",
      size: "normal",
      callback: (token) => {
        dispatchSmsForm({ type: "SET_BOTCHECK", payload: token });
      },
    });

    return () => {
      // 组件卸载或 enabled 变为 false 时清理
      if (turnstileIdRef.current) {
        turnstileIns.remove(turnstileIdRef.current);
        turnstileIdRef.current = null;
      }
    };
  }, [enabled, theme, containerId]);

  // 监听手机号变化，重置状态
  useEffect(() => {
    if (phone !== prevPhoneRef.current) {
      if (prevPhoneRef.current && smsForm.botcheck) {
        dispatchSmsForm({ type: "RESET" });
        if (turnstileIns && turnstileIdRef.current) {
          turnstileIns.reset(turnstileIdRef.current);
        }
      }
      prevPhoneRef.current = phone;
      setError(null);
    }
  }, [phone, smsForm.botcheck]);

  const getSmsCode = useCallback(async () => {
    if (countdown > 0) return;

    if (import.meta.env.PROD) {
      if (!smsForm.botcheck) return setError("请先通过人机验证");
    }

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
        botcheck: smsForm.botcheck,
        phone,
      });

      if (result.success && "code" in result) return setCountdown(20);

      // 发送失败，重置人机验证
      dispatchSmsForm({ type: "RESET" });
      if (turnstileIns && turnstileIdRef.current) {
        turnstileIns.reset(turnstileIdRef.current);
      }

      if (!result.success && "message" in result)
        return setError(result.message);

      setError("发送失败，请稍后重试");
    } catch {
      // 网络错误，重置人机验证
      dispatchSmsForm({ type: "RESET" });
      if (turnstileIns && turnstileIdRef.current) {
        turnstileIns.reset(turnstileIdRef.current);
      }
      setError("网络错误，请稍后重试");
    }
  }, [phone, smsForm.botcheck, countdown]);

  useEffect(() => {
    if (countdown > 0) {
      countdownTimerRef.current = window.setInterval(() => {
        setCountdown((prev) => {
          if (prev > 1) return prev - 1;

          if (!countdownTimerRef.current) return 0;

          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          return 0;
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

  return {
    smsForm,
    dispatchSmsForm,
    error,
    setError,
    countdown,
    getSmsCode,
    reset,
  };
}
