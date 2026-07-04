import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import { RequestSmsCodeDocument } from "@/client/graphql/__generated__";
import { apolloClient } from "@/client/graphql/client";

/**
 * 阿里云验证码 2.0 (CAPTCHA 2.0)
 * 使用弹出式验证，用户点击「获取验证码」时手动触发验证弹窗
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
  enabled = true,
  captchaPrefix = DEFAULT_CAPTCHA_PREFIX,
  captchaSceneId = DEFAULT_CAPTCHA_SCENE_ID,
}: {
  phone: string;
  containerId?: string;
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

  const userRequestedRef = useRef(false);

  const [smsForm, dispatchSmsForm] = useReducer(
    smsFormReducer,
    INITIAL_SMS_FORM_STATE,
  );

  const reset = useCallback(() => {
    dispatchSmsForm({ type: "RESET" });
    setCountdown(0);
    setError(null);
  }, []);

  const initCaptchaInstance =
    useCallback(async (): Promise<AliyunCaptchaInstance | null> => {
      console.log("[useSmsCode:initCaptcha] start", { hasCurrent: !!captchaInstanceRef.current, failed: captchaFailedRef.current, initializing: initializingRef.current, hasSDK: !!window.initAliyunCaptcha });
      if (captchaInstanceRef.current) return captchaInstanceRef.current;
      if (captchaFailedRef.current) return null;
      if (initializingRef.current) return null;
      if (!window.initAliyunCaptcha) {
        console.warn("[useSmsCode:initCaptcha] window.initAliyunCaptcha not found");
        return null;
      }

      initializingRef.current = true;

      try {
        let resolvedInstance: AliyunCaptchaInstance | null = null;

        console.log("[useSmsCode:initCaptcha] calling initAliyunCaptcha", { captchaSceneId, captchaPrefix, containerId });
        const initPromise = window.initAliyunCaptcha({
          SceneId: captchaSceneId,
          prefix: captchaPrefix,
          mode: "popup",
          element: containerId,
          button: "#__captcha_no_bindbutton__",
          captchaVerifyCallback: async (captchaVerifyParam) => {
            console.log("[useSmsCode:captchaVerifyCallback] triggered, userRequested:", userRequestedRef.current);
            if (!userRequestedRef.current) {
              console.log("[useSmsCode:captchaVerifyCallback] skipping (auto-trigger)");
              return { captchaResult: true, bizResult: false };
            }

            try {
              console.log("[useSmsCode:captchaVerifyCallback] sending requestSmsCode mutation, phone:", phoneRef.current);
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

              return { captchaResult: true, bizResult: false };
            } catch (err) {
              console.error("[useSmsCode:captchaVerifyCallback] mutation error:", err);
              return { captchaResult: true, bizResult: false };
            }
          },
          onBizResultCallback: (bizResult) => {
            console.log("[useSmsCode:onBizResultCallback] bizResult:", bizResult, "userRequested:", userRequestedRef.current);
            if (!userRequestedRef.current) return;
            userRequestedRef.current = false;

            if (bizResult) {
              setCountdown(20);
              setError(null);
            } else {
              setError("发送失败，请稍后重试");
            }
          },
          getInstance: (inst) => {
            console.log("[useSmsCode:getInstance] received instance:", !!inst);
            resolvedInstance = inst;
            captchaInstanceRef.current = inst;
          },
          slideStyle: { width: 360, height: 40 },
          language: "cn",
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Captcha init timeout")), 8000),
        );

        await Promise.race([initPromise, timeoutPromise]);
        console.log("[useSmsCode:initCaptcha] init resolved, instance:", !!resolvedInstance);

        if (resolvedInstance) {
          captchaInstanceRef.current = resolvedInstance;
        }

        return captchaInstanceRef.current;
      } catch (err) {
        console.error("[useSmsCode:initCaptcha] FAILED:", err);
        captchaFailedRef.current = true;
        return null;
      } finally {
        initializingRef.current = false;
      }
    }, [containerId, captchaPrefix, captchaSceneId]);

  // 等待 SDK 加载
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
    // 轮询等待 SDK
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

    // 非生产环境或验证码未启用时直接发送
    if (!import.meta.env.PROD || !enabled) {
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

        if (data?.requestSmsCode?.message) {
          return setError(data.requestSmsCode.message);
        }

        setError("发送失败，请稍后重试");
      } catch (err) {
        console.error("[useSmsCode:getSmsCode] direct send error:", err);
        setError("网络错误，请稍后重试");
      }
      return;
    }

    // 生产环境：初始化并弹出验证码
    console.log("[useSmsCode:getSmsCode] prod path, showing captcha");
    userRequestedRef.current = true;
    const instance = await initCaptchaInstance();
    console.log("[useSmsCode:getSmsCode] captcha instance:", !!instance, "hasShow:", !!instance?.show);
    if (instance?.show) {
      instance.show();
    } else {
      // captcha SDK 未加载成功，直接发送短信
      console.warn("[useSmsCode:getSmsCode] captcha fallback - no instance, sending directly");
      userRequestedRef.current = false;
      try {
        const { data } = await apolloClient.mutate({
          mutation: RequestSmsCodeDocument,
          variables: {
            input: { botcheck: null, phone },
          },
        });
        console.log("[useSmsCode:getSmsCode] fallback send result:", JSON.stringify(data));

        if (data?.requestSmsCode?.success) return setCountdown(20);

        if (data?.requestSmsCode?.message) {
          return setError(data.requestSmsCode.message);
        }

        setError("发送失败，请稍后重试");
      } catch (err) {
        console.error("[useSmsCode:getSmsCode] fallback send error:", err);
        setError("网络错误，请稍后重试");
      }
    }
  }, [phone, countdown, enabled, initCaptchaInstance]);

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
