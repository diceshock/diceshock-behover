import { CameraIcon, WarningIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "../../modal";

const INTERNAL_HOSTS = [
  "diceshock.com",
  "www.diceshock.com",
  "runespark.fun",
  "www.runespark.fun",
];

function isInternalHost(hostname: string): boolean {
  if (INTERNAL_HOSTS.includes(hostname)) return true;
  if (import.meta.env.DEV && hostname === "localhost") return true;
  return false;
}

type ScanState =
  | { status: "scanning" }
  | { status: "error"; message: string }
  | { status: "scanned"; url: string; isInternal: boolean };

export default function QRScannerDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<import("qr-scanner").default | null>(null);
  const [scanState, setScanState] = useState<ScanState>({ status: "scanning" });
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setScanState({ status: "scanning" });
    onClose();
  }, [onClose]);

  const handleScanResult = useCallback((data: string) => {
    scannerRef.current?.stop();

    let parsed: URL;
    try {
      parsed = new URL(data);
    } catch {
      setScanState({
        status: "error",
        message: `无法识别的二维码内容: ${data}`,
      });
      return;
    }

    const internal = isInternalHost(parsed.hostname);
    setScanState({ status: "scanned", url: data, isInternal: internal });
  }, []);

  const handleNavigate = useCallback(() => {
    if (scanState.status !== "scanned") return;

    const parsed = new URL(scanState.url);
    const isSameHost = parsed.hostname === window.location.hostname;

    if (scanState.isInternal && isSameHost) {
      navigate({ to: parsed.pathname + parsed.search + parsed.hash });
      handleClose();
    } else if (scanState.isInternal) {
      window.location.href = scanState.url;
    } else {
      handleClose();
      window.location.href = `/external-redirect?url=${encodeURIComponent(scanState.url)}`;
    }
  }, [scanState, navigate, handleClose]);

  const handleRescan = useCallback(() => {
    setScanState({ status: "scanning" });
    scannerRef.current?.start();
  }, []);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    let cancelled = false;

    const initScanner = async () => {
      const QrScanner = (await import("qr-scanner")).default;

      if (cancelled || !videoRef.current) return;

      const scanner = new QrScanner(
        videoRef.current,
        (result) => handleScanResult(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
        },
      );

      scannerRef.current = scanner;

      try {
        await scanner.start();
      } catch (err) {
        if (!cancelled) {
          setScanState({
            status: "error",
            message:
              err instanceof Error
                ? `摄像头访问失败: ${err.message}`
                : "摄像头访问失败，请检查权限设置",
          });
        }
      }
    };

    initScanner();

    return () => {
      cancelled = true;
      scannerRef.current?.stop();
      scannerRef.current?.destroy();
      scannerRef.current = null;
    };
  }, [isOpen, handleScanResult]);

  return (
    <Modal
      isCloseOnClick
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) handleClose();
      }}
    >
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-120 min-h-64 max-h-[80vh] rounded-xl px-0 pb-4 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-hidden",
          "border border-base-content/30",
        )}
      >
        <div className="flex items-center justify-between px-7 pb-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <CameraIcon weight="fill" className="size-5" />
            扫描二维码
          </h3>

          <button onClick={handleClose} className="btn btn-sm btn-circle">
            <XIcon className="size-4" weight="bold" />
          </button>
        </div>

        <div className="relative w-full aspect-square bg-black overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" />

          {scanState.status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-primary rounded-lg opacity-60" />
            </div>
          )}
        </div>

        <div className="px-7 pt-4">
          {scanState.status === "scanning" && (
            <p className="text-sm text-base-content/60 text-center">
              将二维码对准摄像头进行扫描
            </p>
          )}

          {scanState.status === "error" && (
            <div className="flex flex-col gap-3">
              <div role="alert" className="alert alert-error alert-soft">
                <WarningIcon className="text-error size-4" />
                <span className="text-sm">{scanState.message}</span>
              </div>
              <button
                onClick={handleRescan}
                className="btn btn-sm btn-ghost self-center"
              >
                重新扫描
              </button>
            </div>
          )}

          {scanState.status === "scanned" && (
            <div className="flex flex-col gap-3">
              <div className="text-sm break-all bg-base-200 rounded-lg p-3">
                <span className="text-base-content/60">扫描结果: </span>
                <span>{scanState.url}</span>
              </div>

              <div className="flex gap-2 justify-center">
                {scanState.isInternal ? (
                  <button
                    onClick={handleNavigate}
                    className="btn btn-sm btn-primary"
                  >
                    前往页面
                  </button>
                ) : (
                  <button
                    onClick={handleNavigate}
                    className="btn btn-sm btn-warning"
                  >
                    跳转站外链接
                  </button>
                )}

                <button onClick={handleRescan} className="btn btn-sm btn-ghost">
                  重新扫描
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
