import {
  CameraIcon,
  ScanIcon,
  TableIcon,
  UserIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpcClientDash } from "@/shared/utils/trpc";
import Modal from "../modal";

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
  | { status: "resolving"; raw: string }
  | { status: "error"; message: string }
  | {
      status: "resolved";
      type: "user";
      userId: string;
      label: string;
    }
  | {
      status: "resolved";
      type: "table";
      tableId: string;
      label: string;
    };

function tryParseTableCode(data: string): string | null {
  try {
    const url = new URL(data);
    if (!isInternalHost(url.hostname)) return null;
    const match = url.pathname.match(/^\/t\/([A-Za-z0-9]+)$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function tryParseTotpPayload(
  data: string,
): { totp: string; ua: string; lt: number } | null {
  try {
    const parsed = JSON.parse(data);
    if (
      typeof parsed.totp === "string" &&
      typeof parsed.ua === "string" &&
      typeof parsed.lt === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export default function DashQRScannerDialog({
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

  const handleRescan = useCallback(() => {
    setScanState({ status: "scanning" });
    scannerRef.current?.start();
  }, []);

  const handleScanResult = useCallback(async (data: string) => {
    scannerRef.current?.stop();
    setScanState({ status: "resolving", raw: data });

    const tableCode = tryParseTableCode(data);
    if (tableCode) {
      try {
        const table = await trpcClientDash.tablesManagement.getByCode.query({
          code: tableCode,
        });
        setScanState({
          status: "resolved",
          type: "table",
          tableId: table.id,
          label: table.name,
        });
      } catch (err) {
        setScanState({
          status: "error",
          message: err instanceof Error ? err.message : "桌台查询失败",
        });
      }
      return;
    }

    const totpPayload = tryParseTotpPayload(data);
    if (totpPayload) {
      try {
        const result =
          await trpcClientDash.users.verifyTotp.mutate(totpPayload);
        if (result.success) {
          setScanState({
            status: "resolved",
            type: "user",
            userId: result.userId,
            label: `用户 ${result.userId.slice(0, 8)}...`,
          });
        } else {
          setScanState({
            status: "error",
            message: result.message,
          });
        }
      } catch (err) {
        setScanState({
          status: "error",
          message: err instanceof Error ? err.message : "验证失败",
        });
      }
      return;
    }

    setScanState({
      status: "error",
      message: `无法识别的二维码格式: ${data.length > 100 ? `${data.slice(0, 100)}...` : data}`,
    });
  }, []);

  const handleNavigate = useCallback(() => {
    if (scanState.status !== "resolved") return;

    if (scanState.type === "table") {
      navigate({ to: "/dash/tables/$id", params: { id: scanState.tableId } });
    } else {
      navigate({ to: "/dash/users/$id", params: { id: scanState.userId } });
    }
    handleClose();
  }, [scanState, navigate, handleClose]);

  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    let cancelled = false;

    const initScanner = async () => {
      const QrScanner = (await import("qr-scanner")).default;

      if (cancelled || !videoRef.current) return;

      const scanner = new QrScanner(
        videoRef.current,
        (result) => void handleScanResult(result.data),
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

          {scanState.status === "resolving" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60">
              <span className="loading loading-spinner loading-lg text-white" />
            </div>
          )}
        </div>

        <div className="px-7 pt-4">
          {scanState.status === "scanning" && (
            <p className="text-sm text-base-content/60 text-center">
              将用户或桌台二维码对准摄像头
            </p>
          )}

          {scanState.status === "resolving" && (
            <p className="text-sm text-base-content/60 text-center">
              正在识别...
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

          {scanState.status === "resolved" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 bg-base-200 rounded-lg p-3">
                <div
                  className={clsx(
                    "p-2 rounded-lg",
                    scanState.type === "user"
                      ? "bg-primary/10"
                      : "bg-accent/10",
                  )}
                >
                  {scanState.type === "user" ? (
                    <UserIcon className="size-5 text-primary" weight="fill" />
                  ) : (
                    <TableIcon className="size-5 text-accent" weight="fill" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-base-content/60">
                    {scanState.type === "user" ? "用户" : "桌台"}
                  </span>
                  <span className="font-medium text-sm">{scanState.label}</span>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <button
                  onClick={handleNavigate}
                  className="btn btn-sm btn-primary"
                >
                  <ScanIcon className="size-4" />
                  前往详情
                </button>

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
