import clsx from "clsx";

interface Props {
  visible: boolean;
  retryCount: number;
}

export default function DisconnectionOverlay({ visible, retryCount }: Props) {
  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-base-100/80 backdrop-blur-sm transition-opacity duration-300",
        visible
          ? "opacity-100 pointer-events-auto"
          : "opacity-0 pointer-events-none",
      )}
    >
      <span className="loading loading-spinner loading-lg text-primary" />
      <p className="mt-4 text-base font-medium text-base-content/70">
        正在重新连接...
      </p>
      {retryCount > 0 && (
        <p className="mt-1 text-xs text-base-content/40">
          第 {retryCount} 次重试
        </p>
      )}
    </div>
  );
}
