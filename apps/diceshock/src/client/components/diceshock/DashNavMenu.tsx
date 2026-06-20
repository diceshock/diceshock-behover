import {
  CalendarDotsIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  GaugeIcon,
  ImageSquareIcon,
  ListIcon,
  MegaphoneIcon,
  ScanIcon,
  SignOutIcon,
  SwordIcon,
  TableIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link, useMatches } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import ThemeSwap from "@/client/components/ThemeSwap";
import { useTranslation } from "@/client/hooks/useTranslation";
import type { TranslationKey } from "@/shared/i18n";
import DashQRScannerDialog from "./DashQRScannerDialog";

const NAV_ITEMS: ReadonlyArray<{
  to: string;
  icon: typeof GaugeIcon;
  labelKey: TranslationKey;
  exact?: boolean;
}> = [
  { to: "/dash", icon: GaugeIcon, labelKey: "dashNav.dashboard", exact: true },
  { to: "/dash/users", icon: UsersIcon, labelKey: "dashNav.users" },
  { to: "/dash/actives", icon: CalendarDotsIcon, labelKey: "dashNav.actives" },
  { to: "/dash/events", icon: MegaphoneIcon, labelKey: "dashNav.events" },
  { to: "/dash/tables", icon: TableIcon, labelKey: "dashNav.tables" },
  { to: "/dash/orders", icon: ClipboardTextIcon, labelKey: "dashNav.orders" },
  { to: "/dash/gsz", icon: SwordIcon, labelKey: "dashNav.mahjong" },
  {
    to: "/dash/pricing",
    icon: CurrencyDollarIcon,
    labelKey: "dashNav.pricing",
  },
  { to: "/dash/media", icon: ImageSquareIcon, labelKey: "dashNav.media" },
];

export function DashNavMenuButton() {
  const { t } = useTranslation();
  return (
    <label
      htmlFor="dash-nav-drawer"
      className="btn btn-ghost btn-square btn-sm lg:hidden cursor-pointer"
      aria-label={t("dashNav.menuLabel")}
    >
      <ListIcon className="size-5" />
    </label>
  );
}

function SidebarContent({
  currentPath,
  close,
  onScanClick,
  className,
}: {
  currentPath: string;
  close: () => void;
  onScanClick: () => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const isActive = (to: string, exact?: boolean) => {
    if (exact) return currentPath === to || currentPath === `${to}/`;
    return currentPath.startsWith(to);
  };

  return (
    <ul className={clsx("menu menu-xl flex-1 rounded-none", className)}>
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <Link
            to={item.to}
            className={clsx(
              "gap-12 flex-nowrap",
              isActive(item.to, item.exact) && "active",
            )}
            onClick={close}
          >
            <item.icon className="size-6 shrink-0" />
            <span className="whitespace-nowrap">{t(item.labelKey)}</span>
          </Link>
        </li>
      ))}

      <li className="mt-auto">
        <button
          type="button"
          className="gap-12 flex-nowrap"
          onClick={() => {
            close();
            onScanClick();
          }}
        >
          <ScanIcon className="size-6 shrink-0" />
          <span className="whitespace-nowrap">{t("dashNav.scan")}</span>
        </button>
      </li>

      <li>
        <label className="gap-12 flex-nowrap">
          <ThemeSwap />
          <span className="whitespace-nowrap">{t("dashNav.theme")}</span>
        </label>
      </li>

      <li>
        <a
          href="https://diceshock.cloudflareaccess.com/cdn-cgi/access/logout"
          className="gap-12 flex-nowrap"
        >
          <SignOutIcon className="size-6 shrink-0" />
          <span className="whitespace-nowrap">{t("dashNav.logout")}</span>
        </a>
      </li>
    </ul>
  );
}

export default function DashNavDrawer({
  children,
}: {
  children: React.ReactNode;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.pathname ?? "";
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const close = useCallback(() => {
    if (checkboxRef.current) checkboxRef.current.checked = false;
  }, []);

  const onScanClick = useCallback(() => setIsScannerOpen(true), []);

  return (
    <>
      <div
        className={clsx(
          "hidden lg:flex fixed top-0 left-0 h-full z-40",
          "w-16 hover:w-56 transition-[width] duration-200 overflow-hidden",
          "bg-base-200 flex-col",
        )}
      >
        <SidebarContent
          currentPath={currentPath}
          close={close}
          onScanClick={onScanClick}
          className="p-0"
        />
      </div>

      <div className="drawer drawer-end lg:hidden fixed inset-0 z-50 pointer-events-none">
        <input
          id="dash-nav-drawer"
          type="checkbox"
          className="drawer-toggle"
          ref={checkboxRef}
        />
        <div className="drawer-content" />
        <div className="drawer-side pointer-events-auto">
          <label
            htmlFor="dash-nav-drawer"
            aria-label="close sidebar"
            className="drawer-overlay"
          />
          <div className="bg-base-200 min-h-full w-56 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
              <span className="font-bold text-lg">
                {t("dashNav.navigation")}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-square btn-sm"
                onClick={close}
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <SidebarContent
              currentPath={currentPath}
              close={close}
              onScanClick={onScanClick}
            />
          </div>
        </div>
      </div>

      <div className="lg:pl-16 h-screen overflow-hidden">{children}</div>

      <DashQRScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </>
  );
}
