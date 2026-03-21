import { WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

const COUNTDOWN_SECONDS = 5;

export const Route = createFileRoute("/_with-home-lo/external-redirect")({
  validateSearch: (search: Record<string, unknown>) => ({
    url: (search.url as string) ?? "",
  }),
  component: ExternalRedirect,
});

function ExternalRedirect() {
  const { url } = Route.useSearch();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const isValidUrl = (() => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  })();

  useEffect(() => {
    if (!isValidUrl || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isValidUrl, countdown]);

  const handleRedirect = useCallback(() => {
    if (isValidUrl) window.location.href = url;
  }, [isValidUrl, url]);

  if (!url || !isValidUrl) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center">
        <div className="max-w-md mx-auto p-8 text-center flex flex-col items-center gap-4">
          <WarningIcon weight="fill" className="size-16 text-error" />
          <h1 className="text-2xl font-bold">无效的链接</h1>
          <p className="text-base-content/60">提供的链接无效或为空。</p>
          <Link to="/" className="btn btn-primary">
            返回主页
          </Link>
        </div>
      </main>
    );
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = url;
  }

  return (
    <main className="w-full min-h-screen flex items-center justify-center">
      <div className="max-w-lg mx-auto p-8 flex flex-col items-center gap-6">
        <WarningIcon weight="fill" className="size-16 text-warning" />

        <h1 className="text-2xl font-bold text-center">即将离开 DiceShock</h1>

        <p className="text-base-content/60 text-center">
          你即将访问站外链接，请确认是否继续。
        </p>

        <div className="w-full bg-base-200 rounded-lg p-4 break-all text-sm">
          <span className="text-base-content/60">目标地址: </span>
          <span className="font-mono">{hostname}</span>
        </div>

        <div className="w-full bg-warning/10 border border-warning/30 rounded-lg p-4 text-sm text-warning">
          DiceShock 无法保证外部链接的安全性，请注意保护个人信息。
        </div>

        <div className="flex gap-3">
          <Link to="/" className="btn btn-ghost">
            返回主页
          </Link>

          <button
            onClick={handleRedirect}
            disabled={countdown > 0}
            className="btn btn-warning"
          >
            {countdown > 0 ? `继续访问 (${countdown}s)` : "继续访问"}
          </button>
        </div>
      </div>
    </main>
  );
}
