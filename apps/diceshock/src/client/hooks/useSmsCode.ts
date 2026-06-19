import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import trpcClientPublic from "@/shared/utils/trpc";

/**
 * 阿里云验证码 2.0 (CAPTCHA 2.0)
 * 使用弹出式验证，用户点击「获取验证码」时手动触发验证弹窗
 */

const CAPTCHA_PREFIX = "1bqoki";
const CAPTCHA_SCENE_ID = CAPTCHA_PREFIX;

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
}: {
  phone: string;
  containerId?: string;
  enabled?: boolean;
}) {
  const _theme = useAtomValue(themeA);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const captchaInstanceRef = useRef<AliyunCaptchaInstance | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  const initializingRef = useRef(false);

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
      if (captchaInstanceRef.current) return captchaInstanceRef.current;
      if (initializingRef.current) return null;
      if (!window.initAliyunCaptcha) return null;

      initializingRef.current = true;

      try {
        let resolvedInstance: AliyunCaptchaInstance | null = null;

        await window.initAliyunCaptcha({
          SceneId: CAPTCHA_SCENE_ID,
          prefix: CAPTCHA_PREFIX,
          mode: "popup",
          element: containerId,
          // 不绑定 button — 我们手动调用 show()
          button: "#__captcha_no_bindbutton__",
          captchaVerifyCallback: async (captchaVerifyParam) => {
            // SDK 初始化时会自动触发一次静默验证，此时用户尚未点击，直接放行但不发送短信
            if (!userRequestedRef.current) {
              return { captchaResult: true, bizResult: false };
            }

            try {
              const result = await trpcClientPublic.auth.smsCode.mutate({
                botcheck: captchaVerifyParam,
                phone: phoneRef.current,
              });

              if (result.success) {
                return { captchaResult: true, bizResult: true };
              }

              return { captchaResult: true, bizResult: false };
            } catch {
              return { captchaResult: true, bizResult: false };
            }
          },
          onBizResultCallback: (bizResult) => {
            // 忽略 SDK 初始化时的自动回调
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
            resolvedInstance = inst;
            captchaInstanceRef.current = inst;
          },
          slideStyle: { width: 360, height: 40 },
          language: "cn",
        });

        if (resolvedInstance) {
          captchaInstanceRef.current = resolvedInstance;
        }

        return captchaInstanceRef.current;
      } catch (err) {
        console.error("初始化阿里云验证码失败:", err);
        return null;
      } finally {
        initializingRef.current = false;
      }
    }, [containerId]);

  // 等待 SDK 加载
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;

    // SDK 已加载则尝试初始化
    if (window.initAliyunCaptcha) {
      initCaptchaInstance();
      return;
    }

    // 轮询等待 SDK
    const poll = setInterval(() => {
      if (window.initAliyunCaptcha) {
        clearInterval(poll);
        initCaptchaInstance();
      }
    }, 300);

    const timeout = setTimeout(() => clearInterval(poll), 10000);

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
      try {
        const result = await trpcClientPublic.auth.smsCode.mutate({
          botcheck: null,
          phone,
        });

        if (result.success) return setCountdown(20);

        if (!result.success && "message" in result)
          return setError(result.message);

        setError("发送失败，请稍后重试");
      } catch {
        setError("网络错误，请稍后重试");
      }
      return;
    }

    // 生产环境：初始化并弹出验证码
    userRequestedRef.current = true;
    const instance = await initCaptchaInstance();
    if (instance?.show) {
      instance.show();
    } else {
      // captcha SDK 未加载成功，直接发送短信（服务端 captchaDisabled 机制兜底）
      // 重置标志位，防止 SDK 初始化完成后的自动静默验证回调再次发送短信
      userRequestedRef.current = false;
      try {
        const result = await trpcClientPublic.auth.smsCode.mutate({
          botcheck: null,
          phone,
        });

        if (result.success) return setCountdown(20);

        if (!result.success && "message" in result)
          return setError(result.message);

        setError("发送失败，请稍后重试");
      } catch {
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
