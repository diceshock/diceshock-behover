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
import { Link, useMatches, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import ThemeSwap from "@/client/components/ThemeSwap";
import { useCurrentStore } from "@/client/hooks/useStore";
import type { StoreId } from "@/shared/store";
import { STORE_LABELS, STORES } from "@/shared/store";
import DashQRScannerDialog from "./DashQRScannerDialog";

function getNavItems(store: StoreId) {
  return [
    { to: `/dash/${store}`, icon: GaugeIcon, label: "仪表盘", exact: true },
    { to: `/dash/${store}/users`, icon: UsersIcon, label: "用户" },
    { to: `/dash/${store}/actives`, icon: CalendarDotsIcon, label: "约局管理" },
    { to: `/dash/${store}/events`, icon: MegaphoneIcon, label: "活动管理" },
    { to: `/dash/${store}/tables`, icon: TableIcon, label: "桌台管理" },
    { to: `/dash/${store}/orders`, icon: ClipboardTextIcon, label: "订单管理" },
    { to: `/dash/${store}/gsz`, icon: SwordIcon, label: "立直麻将" },
    {
      to: `/dash/${store}/pricing`,
      icon: CurrencyDollarIcon,
      label: "价格计划",
    },
    { to: `/dash/${store}/media`, icon: ImageSquareIcon, label: "媒体库" },
  ] as const;
}

export function DashNavMenuButton() {
  return (
    <label
      htmlFor="dash-nav-drawer"
      className="btn btn-ghost btn-square btn-sm lg:hidden cursor-pointer"
      aria-label="导航菜单"
    >
      <ListIcon className="size-5" />
    </label>
  );
}

function StoreSelector() {
  const store = useCurrentStore();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStore = e.target.value as StoreId;
    const currentPath = window.location.pathname;
    // 替换 /dash/{currentStore}/ 为 /dash/{newStore}/
    const newPath = currentPath.replace(`/dash/${store}`, `/dash/${newStore}`);
    void navigate({ to: newPath });
  };

  return (
    <div className="px-4 py-2 border-b border-base-300">
      <select
        className="select select-sm select-bordered w-full"
        value={store}
        onChange={handleChange}
        aria-label="选择店铺"
      >
        {STORES.map((s) => (
          <option key={s} value={s}>
            {STORE_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
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
  const store = useCurrentStore();
  const navItems = getNavItems(store);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return currentPath === to || currentPath === `${to}/`;
    return currentPath.startsWith(to);
  };

  return (
    <ul className={clsx("menu menu-xl flex-1 rounded-none", className)}>
      {navItems.map((item) => (
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
            <span className="whitespace-nowrap">{item.label}</span>
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
          <span className="whitespace-nowrap">扫码管理</span>
        </button>
      </li>

      <li>
        <label className="gap-12 flex-nowrap">
          <ThemeSwap />
          <span className="whitespace-nowrap">主题</span>
        </label>
      </li>

      <li>
        <a
          href="https://diceshock.cloudflareaccess.com/cdn-cgi/access/logout"
          className="gap-12 flex-nowrap"
        >
          <SignOutIcon className="size-6 shrink-0" />
          <span className="whitespace-nowrap">登出</span>
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
        <StoreSelector />
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
              <span className="font-bold text-lg">导航</span>
              <button
                type="button"
                className="btn btn-ghost btn-square btn-sm"
                onClick={close}
              >
                <XIcon className="size-5" />
              </button>
            </div>
            <StoreSelector />
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
