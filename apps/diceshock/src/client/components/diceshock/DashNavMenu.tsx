import {
  CalendarDotsIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  GaugeIcon,
  ListIcon,
  MegaphoneIcon,
  ScanIcon,
  SignOutIcon,
  TableIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link, useMatches } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useRef, useState } from "react";
import ThemeSwap from "@/client/components/ThemeSwap";
import DashQRScannerDialog from "./DashQRScannerDialog";

const NAV_ITEMS: ReadonlyArray<{
  to: string;
  icon: typeof GaugeIcon;
  label: string;
  exact?: boolean;
}> = [
  { to: "/dash", icon: GaugeIcon, label: "仪表盘", exact: true },
  { to: "/dash/users", icon: UsersIcon, label: "用户" },
  { to: "/dash/actives", icon: CalendarDotsIcon, label: "约局管理" },
  { to: "/dash/events", icon: MegaphoneIcon, label: "活动管理" },
  { to: "/dash/tables", icon: TableIcon, label: "桌台管理" },
  { to: "/dash/orders", icon: ClipboardTextIcon, label: "订单管理" },
  { to: "/dash/pricing", icon: CurrencyDollarIcon, label: "价格计划" },
];

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
      {/* Desktop: placeholder + absolute sidebar */}
      <div className="hidden lg:flex min-h-screen">
        <div className="w-16 shrink-0" />

        <div
          className={clsx(
            "fixed top-0 left-0 h-full z-40",
            "w-16 hover:w-56 transition-[width] duration-200 overflow-hidden",
            "bg-base-200 flex flex-col",
          )}
        >
          <SidebarContent
            currentPath={currentPath}
            close={close}
            onScanClick={onScanClick}
            className="p-0"
          />
        </div>

        <div className="flex-1 min-h-screen">{children}</div>
      </div>

      {/* Mobile: DaisyUI drawer */}
      <div className="drawer lg:hidden">
        <input
          id="dash-nav-drawer"
          type="checkbox"
          className="drawer-toggle"
          ref={checkboxRef}
        />

        <div className="drawer-content flex min-h-screen">{children}</div>

        <div className="drawer-side z-50">
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

            <SidebarContent
              currentPath={currentPath}
              close={close}
              onScanClick={onScanClick}
            />
          </div>
        </div>
      </div>

      <DashQRScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </>
  );
}
