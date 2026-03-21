import { useCallback, useEffect, useRef, useState } from "react";
import { generateTOTP, getRemainingSeconds } from "@/shared/utils/totp";
import trpcClientPublic from "@/shared/utils/trpc";

const TOTP_SECRET_KEY = "diceshock_totp_secret";
const TOTP_LOGIN_TIME_KEY = "diceshock_totp_login_time";

function getCachedSecret(): string | null {
  try {
    return localStorage.getItem(TOTP_SECRET_KEY);
  } catch {
    return null;
  }
}

function setCachedSecret(secret: string) {
  try {
    localStorage.setItem(TOTP_SECRET_KEY, secret);
  } catch {}
}

export function getLoginTime(): number {
  try {
    const stored = localStorage.getItem(TOTP_LOGIN_TIME_KEY);
    if (stored) return Number(stored);
  } catch {}
  return 0;
}

export function setLoginTime(time: number) {
  try {
    localStorage.setItem(TOTP_LOGIN_TIME_KEY, String(time));
  } catch {}
}

interface TOTPState {
  code: string;
  remainingSeconds: number;
  secret: string | null;
  isLoading: boolean;
  error: string | null;
}

export default function useTOTP(enabled: boolean) {
  const [state, setState] = useState<TOTPState>({
    code: "",
    remainingSeconds: getRemainingSeconds(),
    secret: null,
    isLoading: true,
    error: null,
  });

  const secretRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchSecret = useCallback(async () => {
    const cached = getCachedSecret();
    if (cached) {
      secretRef.current = cached;
      setState((s) => ({ ...s, secret: cached, isLoading: false }));
      return;
    }

    try {
      const result = await trpcClientPublic.auth.getTotpSecret.query();
      if (result.success && result.secret) {
        secretRef.current = result.secret;
        setCachedSecret(result.secret);
        setState((s) => ({
          ...s,
          secret: result.secret,
          isLoading: false,
        }));
      } else {
        setState((s) => ({
          ...s,
          isLoading: false,
          error: "message" in result ? result.message : "获取密钥失败",
        }));
      }
    } catch {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: "网络错误，请稍后重试",
      }));
    }
  }, []);

  const codeRef = useRef<string>("");

  const tick = useCallback(async () => {
    const secret = secretRef.current;
    if (!secret) return;

    const remaining = getRemainingSeconds();
    const newCode = await generateTOTP(secret);
    const codeChanged = newCode !== codeRef.current;
    if (codeChanged) codeRef.current = newCode;

    setState((s) => {
      if (codeChanged)
        return { ...s, code: newCode, remainingSeconds: remaining };
      if (s.remainingSeconds === remaining) return s;
      return { ...s, remainingSeconds: remaining };
    });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchSecret();
  }, [enabled, fetchSecret]);

  useEffect(() => {
    if (!enabled || !state.secret) return;

    tick();

    timerRef.current = setInterval(() => {
      tick();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, state.secret, tick]);

  return state;
}
