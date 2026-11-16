import { useApolloClient } from "@apollo/client";
import {
  CalendarDotsIcon,
  EnvelopeIcon,
  HouseIcon,
  ImageSquareIcon,
  PackageIcon,
  ShieldCheckIcon,
  SwordIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ManagementNav } from "@/client/components/dash/trpg/ManagementNav";
import InventoryManagementCard from "@/client/components/diceshock/InventoryManagementCard";
import {
  CaptchaSettingsDocument,
  SetCaptchaEnabledDocument,
} from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";


export const Route = createFileRoute("/dash/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [captchaEnabled, setCaptchaEnabled] = useState(true);
  const [captchaDisabledUntil, setCaptchaDisabledUntil] = useState<
    number | null
  >(null);
  const [captchaToggling, setCaptchaToggling] = useState(false);

  useEffect(() => {
    client
      .query({ query: CaptchaSettingsDocument })
      .then((res) => {
        setCaptchaEnabled(res.data.captchaSettings.enabled);
        setCaptchaDisabledUntil(
          res.data.captchaSettings.disabledUntil
            ? Number(res.data.captchaSettings.disabledUntil)
            : null,
        );
      })
      .catch(() => {});
  }, [client]);

  const handleCaptchaToggle = useCallback(
    async (enabled: boolean) => {
      setCaptchaToggling(true);
      try {
        const res = await client.mutate({
          mutation: SetCaptchaEnabledDocument,
          variables: { enabled },
        });
        if (res.data?.setCaptchaEnabled) {
          const data = res.data.setCaptchaEnabled;
          setCaptchaEnabled(data.enabled);
          setCaptchaDisabledUntil(
            data.disabledUntil
              ? Number(new Date(data.disabledUntil).getTime())
              : null,
          );
        }
      } catch {
      } finally {
        setCaptchaToggling(false);
      }
    },
    [client],
  );

  return (
    <main className="size-full p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <ManagementNav />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/dash/users"
            search={{ q: "", page: "1" }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.userManagement")}</h3>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <UsersIcon className="size-6 text-accent" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.userManagementDesc")}
              </p>
            </div>
          </Link>

          <Link

            to="/dash/gsz"
            search={{ q: "", page: 1 }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.riichiManagement")}</h3>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <SwordIcon className="size-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.riichiManagementDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/media"
            search={{ q: "", type: "", sort: "uploaded-desc" }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.mediaLibrary")}</h3>
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <ImageSquareIcon className="size-6 text-cyan-500" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.mediaLibraryDesc")}
              </p>
            </div>
          </Link>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-warning" />
              {t("dashIndex.systemSettings")}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("dashIndex.turnstileCheck")}
                </p>
                <p className="text-xs text-base-content/60">
                  {captchaEnabled
                    ? t("dashIndex.turnstileEnabledDesc")
                    : t("dashIndex.turnstileDisabledDesc")}
                </p>
                {!captchaEnabled && captchaDisabledUntil && (
                  <CaptchaCountdown until={captchaDisabledUntil} />
                )}
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={captchaEnabled}
                disabled={captchaToggling}
                onChange={(e) => handleCaptchaToggle(e.target.checked)}
              />
            </div>
            <div className="divider my-0" />
            <InventoryManagementCard />
          </div>
        </div>

        <footer className="border-t border-base-300 pt-4 pb-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a
              href="https://diceshock.com/"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <HouseIcon className="size-3.5" />
              {t("dashIndex.home")}
            </a>
            <span className="text-base-content/30">·</span>
            <a
              href="https://diceshock.com/inventory"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <PackageIcon className="size-3.5" />
              {t("dashIndex.inventoryView")}
            </a>
            <span className="text-base-content/30">·</span>
            <a
              href="https://diceshock.com/contact-us"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <EnvelopeIcon className="size-3.5" />
              {t("dashIndex.contactUs")}
            </a>
            <span className="text-base-content/30">·</span>
            <a
              href="https://diceshock.com/actives"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <CalendarDotsIcon className="size-3.5" />
              {t("dashIndex.activitiesMeetups")}
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function CaptchaCountdown({ until }: { until: number }) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((until - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.floor((until - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  if (remaining <= 0) return null;

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <p className="text-xs text-warning mt-1">
      {formatMessage(t("dashIndex.autoRestoreAfter"), {
        time: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`,
      })}
    </p>
  );
}
