import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import QRCode from "qrcode";
import { useEffect, useMemo, useRef, useState } from "react";
import useCrossData from "@/client/hooks/useCrossData";
import useTOTP, { getLoginTime } from "@/client/hooks/useTOTP";

const TOTP_TIME_STEP = 30;

export default function TOTPCard() {
  const crossData = useCrossData();
  const userAgentRef = useRef(
    crossData?.UserAgentMeta?.userAgent ?? navigator.userAgent,
  );
  const loginTimeRef = useRef(getLoginTime() || Date.now());
  const { code, remainingSeconds, isLoading, error } = useTOTP(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState(false);
  const prevQrPayloadRef = useRef<string | null>(null);

  const qrPayload = useMemo(() => {
    if (!code) return null;
    const payload = `{"totp":"${code}","ua":"${userAgentRef.current}","lt":${loginTimeRef.current}}`;
    if (payload === prevQrPayloadRef.current) return prevQrPayloadRef.current;
    prevQrPayloadRef.current = payload;
    return payload;
  }, [code]);

  useEffect(() => {
    if (!qrPayload || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, qrPayload, {
      width: 180,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => setQrError(true));
  }, [qrPayload]);

  const progress = remainingSeconds / TOTP_TIME_STEP;

  if (error) {
    return (
      <div className="flex items-center gap-3 px-3 py-3">
        <div className="shrink-0 p-2 rounded-lg bg-warning/10">
          <QrCodeIcon className="size-4 text-warning" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">活动验证码</p>
          <p className="text-xs text-error truncate">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <details className="group">
      <summary className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-base-300 active:bg-base-300 transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <div className="shrink-0 p-2 rounded-lg bg-primary/10">
          <QrCodeIcon className="size-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">活动验证码</p>
          {!isLoading && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-lg font-bold tracking-[0.2em] text-base-content select-all">
                {code || "------"}
              </span>
              <div className="flex-1 max-w-16">
                <div className="h-1 rounded-full bg-base-300 overflow-hidden">
                  <div
                    className={clsx(
                      "h-full rounded-full transition-all duration-1000 linear",
                      remainingSeconds <= 5 ? "bg-error" : "bg-primary",
                    )}
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              </div>
              <span
                className={clsx(
                  "text-[10px] font-mono tabular-nums",
                  remainingSeconds <= 5 ? "text-error" : "text-base-content/50",
                )}
              >
                {remainingSeconds}s
              </span>
            </div>
          )}
          {isLoading && (
            <span className="loading loading-dots loading-xs mt-0.5" />
          )}
        </div>
        <svg
          className="size-4 shrink-0 text-base-content/40 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>

      <div className="px-3 pb-3 pt-1">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-white rounded-lg p-2">
            {qrError ? (
              <div className="size-[180px] flex items-center justify-center text-error text-xs">
                二维码生成失败
              </div>
            ) : (
              <canvas ref={canvasRef} />
            )}
          </div>
          <p className="text-[11px] text-base-content/40 text-center leading-relaxed">
            线下活动签到使用，每30秒自动刷新
            <br />
            此验证码仅用于活动验证，不可用于登录
          </p>
        </div>
      </div>
    </details>
  );
}
