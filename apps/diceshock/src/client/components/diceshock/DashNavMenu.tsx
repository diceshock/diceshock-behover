import {
  CalendarDotsIcon,
  CheckIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  GaugeIcon,
  ImageSquareIcon,
  ListIcon,
  MegaphoneIcon,
  MoonIcon,
  ScanIcon,
  SignOutIcon,
  StorefrontIcon,
  SunIcon,
  SwordIcon,
  TableIcon,
  TranslateIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link, useMatches } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtom } from "jotai";
import { useCallback, useRef, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import { useTranslation } from "@/client/hooks/useTranslation";
import type { TranslationKey } from "@/shared/i18n";
import {
  LOCALES,
  type LocaleCode,
  STORES,
  type StoreCode,
} from "@/shared/store-locale";
import trpcClientPublic from "@/shared/utils/trpc";
import Modal from "../modal";
import { themeA } from "../ThemeSwap";
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

function AccountButton({ onClick }: { onClick: () => void }) {
  const { userInfo, session } = useAuth();
  const name = userInfo?.nickname ?? "Anonymous";
  const uid = userInfo?.uid ?? "";
  const shortUid = uid.length > 6 ? `${uid.slice(0, 6)}…` : uid;
  const role = (session?.user as any)?.role as string | undefined;

  const roleBadge =
    role === "admin" ? "管理员" : role === "staff" ? "店员" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      className="gap-12 flex-nowrap w-full"
    >
      <div className="avatar avatar-placeholder shrink-0">
        <div className="bg-primary text-gray-900 size-6 rounded-full overflow-hidden">
          <span className="text-[10px] font-bold">
            {/^[\x20-\x7E\u00A0-\u024F\u0400-\u04FF]/.test(name)
              ? name.slice(0, 2)
              : name.slice(0, 1)}
          </span>
        </div>
      </div>
      <div className="min-w-0 whitespace-nowrap">
        <p className="text-sm font-medium truncate leading-tight">{name}</p>
        <p className="text-[10px] text-base-content/50 truncate leading-tight flex items-center gap-1">
          <span>{shortUid}</span>
          {roleBadge && (
            <span className="badge badge-xs badge-primary">{roleBadge}</span>
          )}
        </p>
      </div>
    </button>
  );
}

type SettingsTab = "theme" | "language" | "store" | null;

function AccountSettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { userInfo } = useAuth();
  const [theme, setTheme] = useAtom(themeA);
  const [activeTab, setActiveTab] = useState<SettingsTab>(null);

  const preferredLocale =
    typeof userInfo?.preferred_locale === "string"
      ? userInfo.preferred_locale
      : "";
  const preferredStore =
    typeof userInfo?.preferred_store_id === "string"
      ? userInfo.preferred_store_id
      : "";

  const handleLocaleSelect = useCallback(
    async (loc: string) => {
      try {
        await trpcClientPublic.users.updatePreferences.mutate({
          preferred_locale: loc || null,
          preferred_store_id: preferredStore || null,
        });
        window.location.reload();
      } catch {}
    },
    [preferredStore],
  );

  const handleStoreSelect = useCallback(
    async (store: string) => {
      try {
        await trpcClientPublic.users.updatePreferences.mutate({
          preferred_locale: preferredLocale || null,
          preferred_store_id: store || null,
        });
        window.location.reload();
      } catch {}
    },
    [preferredLocale],
  );

  const menuItems: Array<{
    key: SettingsTab;
    icon: React.ElementType;
    label: string;
    sublabel: string;
    danger?: boolean;
  }> = [
    {
      key: "theme",
      icon: theme === "dark" ? MoonIcon : SunIcon,
      label: t("dashNav.theme"),
      sublabel: theme === "dark" ? "深色" : "浅色",
    },
    {
      key: "language",
      icon: TranslateIcon,
      label: t("me.preferredLang"),
      sublabel: preferredLocale
        ? (LOCALES[preferredLocale as LocaleCode]?.name ?? "默认")
        : "默认",
    },
    {
      key: "store",
      icon: StorefrontIcon,
      label: t("me.preferredStore"),
      sublabel: preferredStore
        ? (STORES[preferredStore as StoreCode]?.shortName ?? "未选择")
        : "未选择",
    },
  ];

  return (
    <Modal
      isCloseOnClick
      isOpen={isOpen}
      onToggle={(evt) => {
        if (!evt.open) {
          onClose();
          setActiveTab(null);
        }
      }}
    >
      <div
        className={clsx(
          "modal-box max-w-none md:max-w-md min-h-64 max-h-[80vh] rounded-xl px-0 pb-0 flex flex-col",
          "absolute not-md:bottom-0 not-md:left-0 not-md:w-full not-md:rounded-none overflow-hidden",
          "border border-base-content/30",
        )}
      >
        <button
          onClick={() => {
            onClose();
            setActiveTab(null);
          }}
          className="btn btn-sm btn-circle absolute top-3 right-3 z-10"
          aria-label="关闭"
        >
          <XIcon className="size-4" weight="bold" />
        </button>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="w-40 shrink-0 flex flex-col border-r border-base-content/10 py-3 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    setActiveTab(isActive ? null : (item.key as SettingsTab))
                  }
                  className={clsx(
                    "flex items-center gap-2.5 w-full px-4 py-2.5 text-left transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-base-200 text-base-content",
                  )}
                >
                  <Icon
                    className="size-4 shrink-0"
                    weight={isActive ? "fill" : "regular"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{item.label}</p>
                    <p className="text-[10px] text-base-content/50 truncate">
                      {item.sublabel}
                    </p>
                  </div>
                </button>
              );
            })}

            <div className="border-t border-base-content/10 mt-auto pt-2">
              <a
                href="https://diceshock.cloudflareaccess.com/cdn-cgi/access/logout"
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left hover:bg-error/10 transition-colors"
              >
                <SignOutIcon className="size-4 shrink-0 text-error" />
                <p className="text-xs font-medium text-error">
                  {t("dashNav.logout")}
                </p>
              </a>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-3 px-2">
            {activeTab === null && (
              <div className="flex flex-col items-center justify-center h-full text-base-content/30 text-xs">
                选择左侧选项
              </div>
            )}

            {activeTab === "theme" && (
              <div className="flex flex-col gap-0.5">
                {(["light", "dark"] as const).map((t) => {
                  const isActive = theme === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTheme(t)}
                      className={clsx(
                        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-base-200 text-base-content",
                      )}
                    >
                      <span className="w-5 shrink-0 flex items-center justify-center">
                        {isActive && (
                          <CheckIcon className="size-4" weight="bold" />
                        )}
                      </span>
                      {t === "light" ? (
                        <span className="flex items-center gap-2">
                          <SunIcon className="size-4" weight="fill" />
                          浅色
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <MoonIcon className="size-4" weight="fill" />
                          深色
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "language" && (
              <div className="flex flex-col gap-0.5">
                {(
                  Object.values(LOCALES) as Array<(typeof LOCALES)[LocaleCode]>
                ).map((entry) => {
                  const isActive = entry.code === preferredLocale;
                  return (
                    <button
                      key={entry.code}
                      type="button"
                      onClick={() => handleLocaleSelect(entry.code)}
                      className={clsx(
                        "flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-colors text-left",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-base-200 text-base-content",
                      )}
                    >
                      <span className="w-5 shrink-0 flex items-center justify-center">
                        {isActive && (
                          <CheckIcon className="size-3.5" weight="bold" />
                        )}
                      </span>
                      <span>{entry.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {activeTab === "store" && (
              <div className="flex flex-col gap-0.5">
                {(
                  Object.values(STORES) as Array<(typeof STORES)[StoreCode]>
                ).map((entry) => {
                  const isActive = entry.code === preferredStore;
                  return (
                    <button
                      key={entry.code}
                      type="button"
                      onClick={() => handleStoreSelect(entry.code)}
                      className={clsx(
                        "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-base-200 text-base-content",
                      )}
                    >
                      <span className="w-5 shrink-0 flex items-center justify-center">
                        {isActive && (
                          <CheckIcon className="size-3.5" weight="bold" />
                        )}
                      </span>
                      <span>{entry.shortName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function SidebarContent({
  currentPath,
  close,
  onScanClick,
  onAccountClick,
  className,
}: {
  currentPath: string;
  close: () => void;
  onScanClick: () => void;
  onAccountClick: () => void;
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
        <AccountButton onClick={onAccountClick} />
      </li>
    </ul>
  );
}

export default function DashNavDrawer({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const checkboxRef = useRef<HTMLInputElement>(null);
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.pathname ?? "";
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const close = useCallback(() => {
    if (checkboxRef.current) checkboxRef.current.checked = false;
  }, []);

  const onScanClick = useCallback(() => setIsScannerOpen(true), []);
  const onAccountClick = useCallback(() => setIsAccountOpen(true), []);

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
          onAccountClick={onAccountClick}
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
              onAccountClick={onAccountClick}
            />
          </div>
        </div>
      </div>

      <div className="lg:pl-16 h-screen overflow-hidden">{children}</div>

      <DashQRScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />

      <AccountSettingsModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
      />
    </>
  );
}
