import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import trpcClientPublic from "@/shared/utils/trpc";

/**
 * 阿里云验证码 2.0 (CAPTCHA 2.0)
 * 使用弹出式验证，用户点击「获取验证码」时弹出人机验证
 */

const CAPTCHA_PREFIX = "1bqoki";
const CAPTCHA_SCENE_ID = CAPTCHA_PREFIX;

declare global {
  interface Window {
    initAliyunCaptcha?: (
      config: AliyunCaptchaConfig,
    ) => Promise<AliyunCaptchaInstance>;
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
  show: () => void;
  hide: () => void;
  refresh: () => void;
  destroy: () => void;
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
  containerId: _containerId = "#captcha-container",
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

  const [smsForm, dispatchSmsForm] = useReducer(
    smsFormReducer,
    INITIAL_SMS_FORM_STATE,
  );

  const reset = useCallback(() => {
    dispatchSmsForm({ type: "RESET" });
    setCountdown(0);
    setError(null);
  }, []);

  // 初始化阿里云验证码实例
  useEffect(() => {
    if (typeof window === "undefined" || !enabled) {
      return;
    }

    let destroyed = false;

    const initCaptcha = async () => {
      // 等待 SDK 加载
      const waitForSDK = (): Promise<void> =>
        new Promise((resolve) => {
          if (window.initAliyunCaptcha) {
            resolve();
            return;
          }
          const poll = setInterval(() => {
            if (window.initAliyunCaptcha) {
              clearInterval(poll);
              resolve();
            }
          }, 200);
          // 10s 超时
          setTimeout(() => {
            clearInterval(poll);
            resolve();
          }, 10000);
        });

      await waitForSDK();

      if (destroyed || !window.initAliyunCaptcha) return;

      try {
        const instance = await window.initAliyunCaptcha({
          SceneId: CAPTCHA_SCENE_ID,
          prefix: CAPTCHA_PREFIX,
          mode: "popup",
          element: "#captcha-element",
          button: "#sms-code-btn",
          captchaVerifyCallback: async (captchaVerifyParam) => {
            // 验证码通过后，发送短信
            try {
              const result = await trpcClientPublic.auth.smsCode.mutate({
                botcheck: captchaVerifyParam,
                phone: phoneRef.current,
              });

              if (result.success) {
                return { captchaResult: true, bizResult: true };
              }

              return {
                captchaResult: true,
                bizResult: false,
              };
            } catch {
              return { captchaResult: true, bizResult: false };
            }
          },
          onBizResultCallback: (bizResult) => {
            if (bizResult) {
              setCountdown(20);
              setError(null);
            } else {
              setError("发送失败，请稍后重试");
            }
          },
          getInstance: (inst) => {
            if (!destroyed) {
              captchaInstanceRef.current = inst;
            }
          },
          slideStyle: { width: 360, height: 40 },
          language: "cn",
        });

        if (!destroyed) {
          captchaInstanceRef.current = instance;
        }
      } catch (err) {
        console.error("初始化阿里云验证码失败:", err);
      }
    };

    initCaptcha();

    return () => {
      destroyed = true;
      if (captchaInstanceRef.current) {
        captchaInstanceRef.current.destroy();
        captchaInstanceRef.current = null;
      }
    };
  }, [enabled]);

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

    // 生产环境下，验证码弹窗由 button id="sms-code-btn" 自动触发
    // 如果 captcha 实例存在但未自动弹出，手动触发
    if (captchaInstanceRef.current) {
      captchaInstanceRef.current.show();
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
