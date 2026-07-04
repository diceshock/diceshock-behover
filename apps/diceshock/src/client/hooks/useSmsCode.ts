import { useAtomValue } from "jotai";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { z } from "zod/v4";
import { themeA } from "@/client/components/ThemeSwap";
import {
  RequestSmsCodeDocument,
  SendSmsCodeDocument,
} from "@/client/graphql/__generated__";
import { apolloClient } from "@/client/graphql/client";

/**
 * 阿里云验证码 2.0 — 正确接入方式
 *
 * 关键：SDK 必须绑定到真实的 button DOM 元素。
 * SDK 拦截按钮点击 → 内部验证(无感/弹窗) → captchaVerifyCallback 触发。
 *
 * 流程：
 * 1. useEffect 在 enabled=true 时初始化 captcha，传 button 指向实际按钮
 * 2. SDK 在该按钮上绑定 onclick 处理器
 * 3. 用户点击按钮 → SDK 拦截 → 验证 → captchaVerifyCallback
 * 4. captchaVerifyCallback 中校验手机号 + 发短信
 * 5. onBizResultCallback 更新 UI 状态
 *
 * 注意：按钮不再需要 React onClick={getSmsCode}，SDK 直接拦截。
 * 但为了向后兼容和 skipCaptcha 模式，保留 getSmsCode 供外部调用。
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
  buttonId = "#login-sms-btn",
  enabled = true,
  skipCaptcha = false,
  captchaPrefix = DEFAULT_CAPTCHA_PREFIX,
  captchaSceneId = DEFAULT_CAPTCHA_SCENE_ID,
}: {
  phone: string;
  /** CSS 选择器: 验证码渲染容器 */
  containerId?: string;
  /** CSS 选择器: 发送验证码按钮（SDK 绑定 onclick） */
  buttonId?: string;
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

  // ========== Captcha 初始化：SDK 绑定按钮，拦截点击 ==========
  useEffect(() => {
    // skipCaptcha 模式或非生产环境不初始化 SDK
    if (skipCaptcha || !import.meta.env.PROD || !enabled) return;
    if (!window.initAliyunCaptcha) {
      console.warn("[useSmsCode] SDK not loaded");
      return;
    }

    // 等待按钮和容器就绪（可能在 modal 动画后）
    let destroyed = false;
    let retryTimer: number | undefined;
    let retryCount = 0;

    function tryInit() {
      if (destroyed) return;

      const buttonEl = document.querySelector(buttonId);
      const containerEl = document.querySelector(containerId);

      if (!buttonEl || !containerEl) {
        retryCount++;
        if (retryCount < 20) {
          // 等 DOM 就绪（modal 可能还在渲染），每 100ms 重试
          retryTimer = window.setTimeout(tryInit, 100);
        } else {
          console.warn("[useSmsCode] button/container not found after retries", {
            buttonId,
            containerId,
          });
        }
        return;
      }

      console.log("[useSmsCode:init] initializing captcha", {
        buttonId,
        containerId,
        captchaSceneId,
      });

      void window.initAliyunCaptcha!({
        SceneId: captchaSceneId,
        prefix: captchaPrefix,
        mode: "popup",
        element: containerId,
        button: buttonId,
        captchaVerifyCallback: async (captchaVerifyParam) => {
          if (destroyed) return { captchaResult: false, bizResult: false };

          console.log("[useSmsCode] captchaVerifyCallback fired");
          setVerifying(true);
          setError(null);

          // 手机号校验
          const currentPhone = phoneRef.current;
          if (!phoneSchema.safeParse(currentPhone).success) {
            setError("请输入正确的手机号码");
            setVerifying(false);
            return { captchaResult: true, bizResult: false };
          }

          // 倒计时检查
          if (countdownRef.current > 0) {
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
            console.error("[useSmsCode] captchaVerifyCallback error:", err);
            setError("网络异常，请检查网络后重试");
            return { captchaResult: true, bizResult: false };
          }
        },
        onBizResultCallback: (bizResult) => {
          console.log("[useSmsCode] onBizResultCallback:", bizResult);
          setVerifying(false);
          if (bizResult) {
            setCountdown(20);
            setError(null);
          }
        },
        getInstance: (inst) => {
          if (destroyed) return;
          captchaInstanceRef.current = inst;
          console.log("[useSmsCode:init] instance ready", {
            hasShow: !!inst?.show,
            hasDestroy: !!inst?.destroy,
          });
        },
        slideStyle: { width: 360, height: 40 },
        language: "cn",
      });
    }

    tryInit();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (captchaInstanceRef.current?.destroy) {
        captchaInstanceRef.current.destroy();
        captchaInstanceRef.current = null;
      }
    };
  }, [enabled, skipCaptcha, buttonId, containerId, captchaPrefix, captchaSceneId]);

  // ========== getSmsCode: 仅用于 skipCaptcha / 非生产模式的直接发送 ==========
  const getSmsCode = useCallback(async () => {
    // 在 captcha 模式下（生产 + enabled + !skipCaptcha），SDK 拦截按钮点击,
    // 这个函数不应该被调用。但为了安全起见保留兼容逻辑。
    if (import.meta.env.PROD && enabled && !skipCaptcha) {
      // SDK 已绑定按钮，不需要手动触发。
      // 如果 SDK 没正确初始化，给出提示。
      if (!captchaInstanceRef.current) {
        console.warn("[useSmsCode:getSmsCode] captcha not initialized, fallback direct send");
      } else {
        // SDK 已初始化并绑定了按钮，点击已被 SDK 处理
        // 这里可能是因为 disabled 按钮被移除后触发的
        return;
      }
    }

    if (countdown > 0) return;

    const phoneResult = phoneSchema.safeParse(phone);
    if (!phoneResult.success) {
      setError("请输入正确的手机号码");
      return;
    }

    setError(null);
    setVerifying(true);

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
  }, [phone, countdown, enabled, skipCaptcha]);

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
