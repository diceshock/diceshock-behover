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
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => setQrError(true));
  }, [qrPayload]);

  const progress = remainingSeconds / TOTP_TIME_STEP;
  const circumference = 2 * Math.PI * 18;
  const dashOffset = circumference * (1 - progress);

  if (error) {
    return (
      <div className="card bg-base-200 w-full border border-base-content/10 shadow-sm">
        <div className="card-body p-4 sm:p-6 md:p-8">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="shrink-0 p-2 sm:p-2.5 bg-warning/10 rounded-lg">
              <QrCodeIcon className="size-5 sm:size-6 md:size-8 text-warning" />
            </div>
            <div className="flex flex-col items-start justify-start flex-1 min-w-0">
              <p className="text-base sm:text-lg font-bold mb-1">活动验证码</p>
              <p className="text-xs sm:text-sm text-error">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-200 w-full border border-base-content/10 shadow-sm">
      <div className="card-body p-4 sm:p-6 md:p-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="shrink-0 p-2 sm:p-2.5 bg-primary/10 rounded-lg">
            <QrCodeIcon className="size-5 sm:size-6 md:size-8 text-primary" />
          </div>
          <div className="flex flex-col items-start justify-start flex-1 min-w-0">
            <p className="text-base sm:text-lg font-bold mb-1">活动验证码</p>
            <p className="text-xs sm:text-sm text-base-content/60">
              线下活动签到使用，每30秒自动更新
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-4">
          {isLoading ? (
            <span className="loading loading-spinner loading-lg" />
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <svg className="size-10 -rotate-90" viewBox="0 0 40 40">
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-base-300"
                    />
                    <circle
                      cx="20"
                      cy="20"
                      r="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                      strokeLinecap="round"
                      className={clsx(
                        "transition-all duration-1000 linear",
                        remainingSeconds <= 5 ? "text-error" : "text-primary",
                      )}
                    />
                  </svg>
                  <span
                    className={clsx(
                      "absolute text-xs font-mono font-bold",
                      remainingSeconds <= 5
                        ? "text-error"
                        : "text-base-content",
                    )}
                  >
                    {remainingSeconds}
                  </span>
                </div>

                <span className="font-mono text-4xl sm:text-5xl font-bold tracking-[0.3em] select-all">
                  {code || "------"}
                </span>
              </div>

              <div className="bg-white rounded-lg p-2">
                {qrError ? (
                  <div className="size-[200px] flex items-center justify-center text-error text-sm">
                    二维码生成失败
                  </div>
                ) : (
                  <canvas ref={canvasRef} />
                )}
              </div>

              <p className="text-xs text-base-content/40 text-center">
                此验证码仅用于线下活动验证，不可用于登录
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
