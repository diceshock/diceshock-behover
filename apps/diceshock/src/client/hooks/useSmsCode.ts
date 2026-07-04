import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import { RequestSmsCodeDocument } from "@/client/graphql/__generated__";
import { apolloClient } from "@/client/graphql/client";

/**
 * 阿里云验证码 2.0 (CAPTCHA 2.0) — 无痕/智能验证
 * SDK 绑定到按钮，用户点击按钮时 SDK 拦截并执行验证（一点就过），
 * 验证通过后触发 captchaVerifyCallback 发送短信。
 */

const DEFAULT_CAPTCHA_PREFIX = "1bqoki";
const DEFAULT_CAPTCHA_SCENE_ID = "1iwji8e9";

declare global {
  interface Window {
    initAliyunCaptcha?: (
      config: AliyunCaptchaConfig,
    ) => Promise<AliyunCaptchaInstance | void>;
  }
}

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
  containerId = "#captcha-element",
  buttonId = "#sms-code-btn",
  enabled = true,
  captchaPrefix = DEFAULT_CAPTCHA_PREFIX,
  captchaSceneId = DEFAULT_CAPTCHA_SCENE_ID,
}: {
  phone: string;
  containerId?: string;
  buttonId?: string;
  enabled?: boolean;
  captchaPrefix?: string;
  captchaSceneId?: string;
}) {
  const _theme = useAtomValue(themeA);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const captchaInstanceRef = useRef<AliyunCaptchaInstance | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  const initializingRef = useRef(false);
  const captchaFailedRef = useRef(false);

  const [smsForm, dispatchSmsForm] = useReducer(
    smsFormReducer,
    INITIAL_SMS_FORM_STATE,
  );

  const reset = useCallback(() => {
    dispatchSmsForm({ type: "RESET" });
    setCountdown(0);
    setError(null);
  }, []);

  const initCaptchaInstance = useCallback(async () => {
    console.log("[useSmsCode:initCaptcha] start", {
      hasCurrent: !!captchaInstanceRef.current,
      failed: captchaFailedRef.current,
      initializing: initializingRef.current,
      hasSDK: !!window.initAliyunCaptcha,
    });
    if (captchaInstanceRef.current) return;
    if (captchaFailedRef.current) return;
    if (initializingRef.current) return;
    if (!window.initAliyunCaptcha) {
      console.warn("[useSmsCode:initCaptcha] window.initAliyunCaptcha not found");
      return;
    }

    initializingRef.current = true;

    try {
      console.log("[useSmsCode:initCaptcha] calling initAliyunCaptcha", {
        captchaSceneId,
        captchaPrefix,
        containerId,
        buttonId,
      });
      const initPromise = window.initAliyunCaptcha({
        SceneId: captchaSceneId,
        prefix: captchaPrefix,
        mode: "popup",
        element: containerId,
        // 绑定到真实按钮 — SDK 拦截按钮点击自动做验证
        button: buttonId,
        captchaVerifyCallback: async (captchaVerifyParam) => {
          console.log("[useSmsCode:captchaVerifyCallback] triggered, phone:", phoneRef.current);

          // 校验手机号
          const phoneResult = z
            .string()
            .min(6)
            .max(20)
            .regex(/^[0-9]*$/)
            .safeParse(phoneRef.current);

          if (!phoneResult.success) {
            console.warn("[useSmsCode:captchaVerifyCallback] invalid phone");
            setError("手机号格式错误");
            return { captchaResult: true, bizResult: false };
          }

          try {
            console.log("[useSmsCode:captchaVerifyCallback] sending requestSmsCode mutation");
            const { data } = await apolloClient.mutate({
              mutation: RequestSmsCodeDocument,
              variables: {
                input: {
                  botcheck: captchaVerifyParam,
                  phone: phoneRef.current,
                },
              },
            });
            console.log("[useSmsCode:captchaVerifyCallback] mutation result:", JSON.stringify(data));

            if (data?.requestSmsCode?.success) {
              return { captchaResult: true, bizResult: true };
            }

            const msg = data?.requestSmsCode?.message;
            if (msg) setError(msg);
            return { captchaResult: true, bizResult: false };
          } catch (err) {
            console.error("[useSmsCode:captchaVerifyCallback] mutation error:", err);
            setError("网络错误，请稍后重试");
            return { captchaResult: true, bizResult: false };
          }
        },
        onBizResultCallback: (bizResult) => {
          console.log("[useSmsCode:onBizResultCallback] bizResult:", bizResult);
          if (bizResult) {
            setCountdown(20);
            setError(null);
          } else {
            // error already set in captchaVerifyCallback if applicable
            if (!error) setError("发送失败，请稍后重试");
          }
        },
        getInstance: (inst) => {
          console.log("[useSmsCode:getInstance] received instance:", !!inst);
          captchaInstanceRef.current = inst;
        },
        slideStyle: { width: 360, height: 40 },
        language: "cn",
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Captcha init timeout")), 8000),
      );

      await Promise.race([initPromise, timeoutPromise]);
      console.log("[useSmsCode:initCaptcha] init resolved, instance:", !!captchaInstanceRef.current);
    } catch (err) {
      console.error("[useSmsCode:initCaptcha] FAILED:", err);
      captchaFailedRef.current = true;
    } finally {
      initializingRef.current = false;
    }
  }, [containerId, buttonId, captchaPrefix, captchaSceneId, error]);

  // 等待 SDK 加载并初始化
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) {
      console.log("[useSmsCode:effect] skipped, enabled:", enabled);
      return;
    }

    // SDK 已加载则尝试初始化
    if (window.initAliyunCaptcha) {
      console.log("[useSmsCode:effect] SDK already loaded, initializing");
      initCaptchaInstance();
      return;
    }

    console.log("[useSmsCode:effect] SDK not loaded, polling...");
    const poll = setInterval(() => {
      if (window.initAliyunCaptcha) {
        console.log("[useSmsCode:effect] SDK loaded via poll, initializing");
        clearInterval(poll);
        initCaptchaInstance();
      }
    }, 300);

    const timeout = setTimeout(() => {
      console.warn("[useSmsCode:effect] SDK poll timed out after 10s");
      clearInterval(poll);
    }, 10000);

    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [enabled, initCaptchaInstance]);

  // 清理
  useEffect(() => {
    return () => {
      if (captchaInstanceRef.current?.destroy) {
        captchaInstanceRef.current.destroy();
        captchaInstanceRef.current = null;
      }
    };
  }, []);

  // getSmsCode 现在只用于非生产/captcha禁用的 fallback
  const getSmsCode = useCallback(async () => {
    console.log("[useSmsCode:getSmsCode] called", { countdown, phone, enabled, prod: import.meta.env.PROD });
    if (countdown > 0) return;

    const phoneResult = z
      .string()
      .min(6)
      .max(20)
      .regex(/^[0-9]*$/)
      .safeParse(phone);

    if (!phoneResult.success) return setError("手机号格式错误");

    setError(null);

    // 生产环境 + captcha 启用 → SDK 自动拦截按钮点击处理，这里不需要做任何事
    if (import.meta.env.PROD && enabled) {
      // 如果 captcha 初始化失败了，fallback 直接发
      if (captchaFailedRef.current) {
        console.warn("[useSmsCode:getSmsCode] captcha failed, fallback direct send");
        try {
          const { data } = await apolloClient.mutate({
            mutation: RequestSmsCodeDocument,
            variables: {
              input: { botcheck: null, phone },
            },
          });
          console.log("[useSmsCode:getSmsCode] fallback result:", JSON.stringify(data));

          if (data?.requestSmsCode?.success) return setCountdown(20);
          if (data?.requestSmsCode?.message) return setError(data.requestSmsCode.message);
          setError("发送失败，请稍后重试");
        } catch (err) {
          console.error("[useSmsCode:getSmsCode] fallback error:", err);
          setError("网络错误，请稍后重试");
        }
      }
      // 正常情况下 SDK 拦截按钮点击，不需要这里处理
      return;
    }

    // 非生产环境或验证码未启用时直接发送
    console.log("[useSmsCode:getSmsCode] direct send (non-prod or captcha disabled)");
    try {
      const { data } = await apolloClient.mutate({
        mutation: RequestSmsCodeDocument,
        variables: {
          input: { botcheck: null, phone },
        },
      });
      console.log("[useSmsCode:getSmsCode] direct send result:", JSON.stringify(data));

      if (data?.requestSmsCode?.success) return setCountdown(20);
      if (data?.requestSmsCode?.message) return setError(data.requestSmsCode.message);
      setError("发送失败，请稍后重试");
    } catch (err) {
      console.error("[useSmsCode:getSmsCode] direct send error:", err);
      setError("网络错误，请稍后重试");
    }
  }, [phone, countdown, enabled]);

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
