import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import { RequestSmsCodeDocument } from "@/client/graphql/__generated__";
import { apolloClient } from "@/client/graphql/client";

/**
 * 阿里云验证码 2.0 — 预初始化绑定按钮，一次点击完成验证+发短信
 *
 * 流程：
 * 1. enabled=true 时 useEffect 预初始化 captcha，绑定到 buttonId
 * 2. 用户点击按钮 → SDK 拦截原生 click → 无痕/弹窗验证
 * 3. 验证通过 → captchaVerifyCallback 触发 → 发送短信 mutation
 * 4. onBizResultCallback 更新 UI 状态（倒计时/错误）
 *
 * React onClick 仅做手机号校验（即时 UI 反馈），不触发 captcha。
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

const phoneSchema = z.string().min(6).max(20).regex(/^[0-9]*$/);

export default function useSmsCode({
  phone,
  containerId = "#captcha-element",
  buttonId = "#captcha-btn",
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
  const [verifying, setVerifying] = useState(false);

  const captchaInstanceRef = useRef<AliyunCaptchaInstance | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const phoneRef = useRef(phone);
  phoneRef.current = phone;
  const countdownRef = useRef(countdown);
  countdownRef.current = countdown;

  const [smsForm, dispatchSmsForm] = useReducer(
    smsFormReducer,
    INITIAL_SMS_FORM_STATE,
  );

  const reset = useCallback(() => {
    dispatchSmsForm({ type: "RESET" });
    setCountdown(0);
    setError(null);
    setVerifying(false);
    if (captchaInstanceRef.current?.destroy) {
      captchaInstanceRef.current.destroy();
      captchaInstanceRef.current = null;
    }
  }, []);

  // ========== 预初始化 captcha ==========
  useEffect(() => {
    if (!enabled || !import.meta.env.PROD) return;
    if (!window.initAliyunCaptcha) return;

    // 等 DOM 就绪
    const btn = document.querySelector(buttonId);
    if (!btn) return;

    let destroyed = false;

    void window.initAliyunCaptcha({
      SceneId: captchaSceneId,
      prefix: captchaPrefix,
      mode: "popup",
      element: containerId,
      button: buttonId,
      captchaVerifyCallback: async (captchaVerifyParam) => {
        if (destroyed) return { captchaResult: false, bizResult: false };

        // 校验手机号
        const currentPhone = phoneRef.current;
        if (!phoneSchema.safeParse(currentPhone).success) {
          setError("请输入正确的手机号码");
          return { captchaResult: true, bizResult: false };
        }

        // 倒计时中不发
        if (countdownRef.current > 0) {
          return { captchaResult: true, bizResult: false };
        }

        setVerifying(true);
        setError(null);

        try {
          const { data } = await apolloClient.mutate({
            mutation: RequestSmsCodeDocument,
            variables: {
              input: { botcheck: captchaVerifyParam, phone: currentPhone },
            },
          });

          if (data?.requestSmsCode?.success) {
            return { captchaResult: true, bizResult: true };
          }

          const msg = data?.requestSmsCode?.message;
          setError(msg ? `发送失败：${msg}` : "发送失败，请稍后重试");
          return { captchaResult: true, bizResult: false };
        } catch (err) {
          console.error("[useSmsCode] send error:", err);
          setError("网络异常，请检查网络后重试");
          return { captchaResult: true, bizResult: false };
        }
      },
      onBizResultCallback: (bizResult) => {
        setVerifying(false);
        if (bizResult) {
          setCountdown(20);
          setError(null);
        }
      },
      getInstance: (inst) => {
        if (!destroyed) captchaInstanceRef.current = inst;
      },
      slideStyle: { width: 360, height: 40 },
      language: "cn",
    });

    return () => {
      destroyed = true;
      if (captchaInstanceRef.current?.destroy) {
        captchaInstanceRef.current.destroy();
        captchaInstanceRef.current = null;
      }
    };
  }, [enabled, buttonId, containerId, captchaPrefix, captchaSceneId]);

  // ========== 非生产 / captcha 未启用时的 fallback ==========
  const getSmsCode = useCallback(async () => {
    if (countdown > 0) return;

    if (!phoneSchema.safeParse(phone).success) {
      setError("请输入正确的手机号码");
      return;
    }

    // 生产环境 + captcha 启用时，SDK 拦截按钮点击自行处理，这里不做任何事
    if (import.meta.env.PROD && enabled && window.initAliyunCaptcha) {
      return;
    }

    // 非生产 / SDK 未加载 → 直接发短信
    setError(null);
    setVerifying(true);
    try {
      const { data } = await apolloClient.mutate({
        mutation: RequestSmsCodeDocument,
        variables: { input: { botcheck: null, phone } },
      });

      if (data?.requestSmsCode?.success) {
        setCountdown(20);
      } else {
        const msg = data?.requestSmsCode?.message;
        setError(msg ? `发送失败：${msg}` : "发送失败，请稍后重试");
      }
    } catch (err) {
      console.error("[useSmsCode] direct send error:", err);
      setError("网络异常，请检查网络后重试");
    } finally {
      setVerifying(false);
    }
  }, [phone, countdown, enabled]);

  // ========== 倒计时 ==========
  useEffect(() => {
    if (countdown <= 0) return;

    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev > 1) return prev - 1;
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        return 0;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [countdown]);

  // 清理
  useEffect(() => {
    return () => {
      if (captchaInstanceRef.current?.destroy) {
        captchaInstanceRef.current.destroy();
        captchaInstanceRef.current = null;
      }
    };
  }, []);

  return {
    smsForm,
    dispatchSmsForm,
    error,
    setError,
    countdown,
    verifying,
    getSmsCode,
    reset,
  };
}
