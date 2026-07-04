import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import { RequestSmsCodeDocument, SendSmsCodeDocument } from "@/client/graphql/__generated__";
import { apolloClient } from "@/client/graphql/client";

/**
 * 阿里云验证码 2.0 — 每次点击时初始化 captcha，SDK 自动完成无感验证
 *
 * 流程：
 * 1. 用户点击发送按钮 → React onClick 调用 getSmsCode
 * 2. getSmsCode 校验手机号 → 销毁旧实例 → 调用 initAliyunCaptcha
 * 3. SDK 初始化时自动做无感/弹窗验证 → captchaVerifyCallback 触发 → 发短信
 * 4. onBizResultCallback 更新 UI 状态（倒计时/错误）
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
  enabled = true,
  skipCaptcha = false,
  captchaPrefix = DEFAULT_CAPTCHA_PREFIX,
  captchaSceneId = DEFAULT_CAPTCHA_SCENE_ID,
}: {
  phone: string;
  containerId?: string;
  enabled?: boolean;
  /** 已登录用户跳过验证码，直接调用 sendSmsCode (需 auth) */
  skipCaptcha?: boolean;
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

  // ========== getSmsCode: 每次点击时初始化 captcha 触发验证 ==========
  const getSmsCode = useCallback(async () => {
    console.log("[useSmsCode:getSmsCode] called", { countdown, phone, enabled });

    if (countdown > 0) return;

    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) {
      setError("请输入正确的手机号码");
      return;
    }

    setError(null);
    setVerifying(true);

    // 跳过验证码：已登录用户直接调用 sendSmsCode，或非生产环境用 requestSmsCode
    if (skipCaptcha || !import.meta.env.PROD || !enabled) {
      const mutation = skipCaptcha ? SendSmsCodeDocument : RequestSmsCodeDocument;
      const mutationName = skipCaptcha ? "sendSmsCode" : "requestSmsCode";
      console.log(`[useSmsCode:getSmsCode] direct send via ${mutationName}`);
      try {
        const { data } = await apolloClient.mutate({
          mutation,
          variables: { input: { botcheck: null, phone } },
        });
        const result = data?.[mutationName];
        if (result?.success) {
          setCountdown(20);
        } else {
          const msg = result?.message;
          setError(msg ? `发送失败：${msg}` : "发送失败，请稍后重试");
        }
      } catch (err) {
        console.error("[useSmsCode] direct send error:", err);
        setError("网络异常，请检查网络后重试");
      } finally {
        setVerifying(false);
      }
      return;
    }

    // 生产环境 → 销毁旧实例，重新初始化 captcha（无 button 绑定，SDK 自动做无感验证）
    if (captchaInstanceRef.current?.destroy) {
      console.log("[useSmsCode] destroying old captcha instance");
      captchaInstanceRef.current.destroy();
      captchaInstanceRef.current = null;
    }

    if (!window.initAliyunCaptcha) {
      console.warn("[useSmsCode] SDK not loaded - window.initAliyunCaptcha is", typeof window.initAliyunCaptcha);
      setError("验证组件未加载，请刷新页面");
      setVerifying(false);
      return;
    }

    // 检查 DOM 容器
    const containerEl = document.querySelector(containerId);
    console.log("[useSmsCode] container check:", {
      containerId,
      exists: !!containerEl,
      visible: containerEl ? getComputedStyle(containerEl).display !== "none" : false,
      parentVisible: containerEl?.parentElement ? getComputedStyle(containerEl.parentElement).display !== "none" : false,
      dimensions: containerEl ? { w: (containerEl as HTMLElement).offsetWidth, h: (containerEl as HTMLElement).offsetHeight } : null,
    });

    const captchaConfig = {
      SceneId: captchaSceneId,
      prefix: captchaPrefix,
      mode: "popup" as const,
      element: containerId,
    };
    console.log("[useSmsCode] initAliyunCaptcha config:", captchaConfig);

    // 超时保护：15 秒内回调未触发则重置
    const timeoutId = setTimeout(() => {
      console.warn("[useSmsCode] captcha timeout - no callback in 15s", {
        instanceExists: !!captchaInstanceRef.current,
        instanceHasShow: !!captchaInstanceRef.current?.show,
        containerNow: !!document.querySelector(containerId),
      });
      setVerifying(false);
      setError("验证超时，请重试");
    }, 15_000);

    try {
      console.log("[useSmsCode] calling initAliyunCaptcha...");
      const initPromise = window.initAliyunCaptcha({
        ...captchaConfig,
        captchaVerifyCallback: async (captchaVerifyParam) => {
          clearTimeout(timeoutId);
          console.log("[useSmsCode] captchaVerifyCallback fired, param length:", captchaVerifyParam?.length);
          const currentPhone = phoneRef.current;
          if (!phoneSchema.safeParse(currentPhone).success) {
            setError("请输入正确的手机号码");
            setVerifying(false);
            return { captchaResult: true, bizResult: false };
          }

          try {
            const { data } = await apolloClient.mutate({
              mutation: RequestSmsCodeDocument,
              variables: {
                input: { botcheck: captchaVerifyParam, phone: currentPhone },
              },
            });

            if (data?.requestSmsCode?.success) {
              console.log("[useSmsCode] SMS sent successfully");
              return { captchaResult: true, bizResult: true };
            }

            const msg = data?.requestSmsCode?.message;
            setError(msg ? `发送失败：${msg}` : "发送失败，请稍后重试");
            return { captchaResult: true, bizResult: false };
          } catch (err) {
            console.error("[useSmsCode] captchaVerifyCallback mutation error:", err);
            setError("网络异常，请检查网络后重试");
            return { captchaResult: true, bizResult: false };
          }
        },
        onBizResultCallback: (bizResult) => {
          clearTimeout(timeoutId);
          console.log("[useSmsCode] onBizResultCallback:", bizResult);
          setVerifying(false);
          if (bizResult) {
            setCountdown(20);
            setError(null);
          }
        },
        getInstance: (inst) => {
          captchaInstanceRef.current = inst;
          console.log("[useSmsCode] getInstance called:", {
            hasShow: !!inst?.show,
            hasRefresh: !!inst?.refresh,
            hasDestroy: !!inst?.destroy,
            keys: inst ? Object.keys(inst) : [],
          });
        },
        slideStyle: { width: 360, height: 40 },
        language: "cn",
      });

      console.log("[useSmsCode] initAliyunCaptcha promise type:", typeof initPromise);
      const inst = await initPromise;
      console.log("[useSmsCode] initAliyunCaptcha resolved:", {
        returnType: typeof inst,
        isNull: inst === null,
        isUndefined: inst === undefined,
        keys: inst && typeof inst === "object" ? Object.keys(inst) : [],
        captchaInstanceRefSet: !!captchaInstanceRef.current,
      });

      // 有些版本 initAliyunCaptcha 直接返回实例
      if (inst && !captchaInstanceRef.current) {
        captchaInstanceRef.current = inst;
        console.log("[useSmsCode] set instance from return value");
      }

      // 如果 getInstance 已返回实例但 callback 未触发，尝试手动 show()
      if (captchaInstanceRef.current?.show) {
        console.log("[useSmsCode] instance has show(), calling it manually as fallback");
        captchaInstanceRef.current.show();
      } else {
        console.log("[useSmsCode] instance does NOT have show() - waiting for auto-verify callback");
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("[useSmsCode] initAliyunCaptcha threw:", err);
      setError("验证初始化失败，请刷新页面重试");
      setVerifying(false);
    }
  }, [phone, countdown, enabled, skipCaptcha, containerId, captchaPrefix, captchaSceneId]);

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
