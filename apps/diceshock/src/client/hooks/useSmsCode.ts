import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import { RequestSmsCodeDocument } from "@/client/graphql/__generated__";
import { apolloClient } from "@/client/graphql/client";

/**
 * 阿里云验证码 2.0 (CAPTCHA 2.0) — 无痕验证 popup 模式
 *
 * 策略：不预初始化。用户每次点击"获取验证码"时：
 * 1. 销毁旧实例
 * 2. 创建新实例 (initAliyunCaptcha)
 * 3. SDK 自动执行无痕验证 → captchaVerifyCallback 触发
 * 4. 在 callback 中发送短信
 * 5. onBizResultCallback 报告结果
 *
 * 这样避免了：
 * - 预初始化消耗验证次数
 * - 按钮绑定与 React DOM 时序冲突
 * - 缓存实例导致 show() 无效
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
  /** @deprecated no longer used — kept for API compat */
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

  const [smsForm, dispatchSmsForm] = useReducer(
    smsFormReducer,
    INITIAL_SMS_FORM_STATE,
  );

  const reset = useCallback(() => {
    dispatchSmsForm({ type: "RESET" });
    setCountdown(0);
    setError(null);
    // 销毁现有实例
    if (captchaInstanceRef.current?.destroy) {
      captchaInstanceRef.current.destroy();
      captchaInstanceRef.current = null;
    }
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      if (captchaInstanceRef.current?.destroy) {
        captchaInstanceRef.current.destroy();
        captchaInstanceRef.current = null;
      }
    };
  }, []);

  /**
   * 核心：每次点击时 fresh init captcha → 自动验证 → callback 发短信
   */
  const getSmsCode = useCallback(async () => {
    console.log("[useSmsCode:getSmsCode] called", {
      countdown,
      phone,
      enabled,
      prod: import.meta.env.PROD,
      hasSDK: !!window.initAliyunCaptcha,
    });

    if (countdown > 0) return;

    const phoneResult = z
      .string()
      .min(6)
      .max(20)
      .regex(/^[0-9]*$/)
      .safeParse(phone);

    if (!phoneResult.success) {
      setError("手机号格式错误");
      return;
    }

    setError(null);

    // 非生产环境或验证码未启用 → 直接发送
    if (!import.meta.env.PROD || !enabled) {
      console.log("[useSmsCode:getSmsCode] direct send (non-prod or disabled)");
      await sendSmsDirect(phone);
      return;
    }

    // 生产环境 — 使用验证码
    if (!window.initAliyunCaptcha) {
      console.warn("[useSmsCode:getSmsCode] SDK not loaded, fallback direct send");
      await sendSmsDirect(phone);
      return;
    }

    // 销毁旧实例，确保全新开始
    if (captchaInstanceRef.current?.destroy) {
      console.log("[useSmsCode:getSmsCode] destroying old instance");
      captchaInstanceRef.current.destroy();
      captchaInstanceRef.current = null;
    }

    console.log("[useSmsCode:getSmsCode] creating fresh captcha instance");

    try {
      await window.initAliyunCaptcha({
        SceneId: captchaSceneId,
        prefix: captchaPrefix,
        mode: "popup",
        element: containerId,
        // 不绑定按钮 — 我们通过 fresh init 触发自动验证
        button: "#__captcha_auto_trigger__",
        captchaVerifyCallback: async (captchaVerifyParam) => {
          console.log("[useSmsCode:captchaVerifyCallback] triggered, phone:", phoneRef.current);

          try {
            const { data } = await apolloClient.mutate({
              mutation: RequestSmsCodeDocument,
              variables: {
                input: {
                  botcheck: captchaVerifyParam,
                  phone: phoneRef.current,
                },
              },
            });
            console.log("[useSmsCode:captchaVerifyCallback] result:", JSON.stringify(data));

            if (data?.requestSmsCode?.success) {
              return { captchaResult: true, bizResult: true };
            }

            const msg = data?.requestSmsCode?.message;
            if (msg) setError(msg);
            return { captchaResult: true, bizResult: false };
          } catch (err) {
            console.error("[useSmsCode:captchaVerifyCallback] error:", err);
            setError("网络错误，请稍后重试");
            return { captchaResult: true, bizResult: false };
          }
        },
        onBizResultCallback: (bizResult) => {
          console.log("[useSmsCode:onBizResultCallback] bizResult:", bizResult);
          if (bizResult) {
            setCountdown(20);
            setError(null);
          }
        },
        getInstance: (inst) => {
          console.log("[useSmsCode:getInstance] received");
          captchaInstanceRef.current = inst;
        },
        slideStyle: { width: 360, height: 40 },
        language: "cn",
      });

      console.log("[useSmsCode:getSmsCode] initAliyunCaptcha resolved");

      // init 完成后 SDK 应该已经自动做了无痕验证并触发了 captchaVerifyCallback
      // 如果 SDK 没有自动触发（某些情况下需要 show），尝试 show
      if (captchaInstanceRef.current?.show) {
        console.log("[useSmsCode:getSmsCode] calling show() as backup");
        captchaInstanceRef.current.show();
      }
    } catch (err) {
      console.error("[useSmsCode:getSmsCode] captcha init failed, fallback:", err);
      // captcha 失败 → fallback 直接发送
      await sendSmsDirect(phone);
    }
  }, [phone, countdown, enabled, containerId, captchaPrefix, captchaSceneId]);

  // 直接发送短信（无验证码）
  const sendSmsDirect = useCallback(
    async (phoneNumber: string) => {
      try {
        const { data } = await apolloClient.mutate({
          mutation: RequestSmsCodeDocument,
          variables: {
            input: { botcheck: null, phone: phoneNumber },
          },
        });
        console.log("[useSmsCode:sendSmsDirect] result:", JSON.stringify(data));

        if (data?.requestSmsCode?.success) {
          setCountdown(20);
          return;
        }
        if (data?.requestSmsCode?.message) {
          setError(data.requestSmsCode.message);
          return;
        }
        setError("发送失败，请稍后重试");
      } catch (err) {
        console.error("[useSmsCode:sendSmsDirect] error:", err);
        setError("网络错误，请稍后重试");
      }
    },
    [],
  );

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
