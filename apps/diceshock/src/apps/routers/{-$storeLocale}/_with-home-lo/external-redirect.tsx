import { WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "@/client/hooks/useTranslation";

const COUNTDOWN_SECONDS = 5;

export const Route = createFileRoute(
  "/{-$storeLocale}/_with-home-lo/external-redirect",
)({
  validateSearch: (search: Record<string, unknown>) => ({
    url: (search.url as string) ?? "",
  }),
  component: ExternalRedirect,
});

function ExternalRedirect() {
  const { t } = useTranslation();
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
          <h1 className="text-2xl font-bold">{t("errors.invalidLink")}</h1>
          <p className="text-base-content/60">{t("errors.invalidLinkDesc")}</p>
          <Link to="/{-$storeLocale}" className="btn btn-primary">
            {t("common.backToHome")}
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

        <h1 className="text-2xl font-bold text-center">
          {t("external.leavingTitle")}
        </h1>

        <p className="text-base-content/60 text-center">
          {t("external.leavingDesc")}
        </p>

        <div className="w-full bg-base-200 rounded-lg p-4 break-all text-sm">
          <span className="text-base-content/60">
            {t("external.targetAddress")}
          </span>
          <span className="font-mono">{hostname}</span>
        </div>

        <div className="w-full bg-warning/10 border border-warning/30 rounded-lg p-4 text-sm text-warning">
          {t("external.securityWarning")}
        </div>

        <div className="flex gap-3">
          <Link to="/{-$storeLocale}" className="btn btn-ghost">
            {t("common.backToHome")}
          </Link>

          <button
            onClick={handleRedirect}
            disabled={countdown > 0}
            className="btn btn-warning"
          >
            {countdown > 0
              ? t("common.continueIn", { countdown })
              : t("common.continue")}
          </button>
        </div>
      </div>
    </main>
  );
}
