import {
  CalendarDotsIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  GaugeIcon,
  ListIcon,
  MegaphoneIcon,
  SignOutIcon,
  TableIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link, useMatches } from "@tanstack/react-router";
import { useCallback, useRef } from "react";
import ThemeSwap from "@/client/components/ThemeSwap";

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

export default function DashNavDrawer({
  children,
}: {
  children: React.ReactNode;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const matches = useMatches();
  const currentPath = matches[matches.length - 1]?.pathname ?? "";

  const close = useCallback(() => {
    if (checkboxRef.current) checkboxRef.current.checked = false;
  }, []);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return currentPath === to || currentPath === `${to}/`;
    return currentPath.startsWith(to);
  };

  return (
    <div className="drawer lg:drawer-open">
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-base-300 lg:hidden">
            <span className="font-bold text-lg">导航</span>
            <button
              type="button"
              className="btn btn-ghost btn-square btn-sm"
              onClick={close}
            >
              <XIcon className="size-5" />
            </button>
          </div>

          <ul className="menu menu-xl flex-1 rounded-none">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={`gap-12 ${isActive(item.to, item.exact) ? "active" : ""}`}
                  onClick={close}
                >
                  <item.icon className="size-6" />
                  {item.label}
                </Link>
              </li>
            ))}

            <li className="mt-auto">
              <label className="gap-12">
                <ThemeSwap />
                主题
              </label>
            </li>

            <li>
              <a
                href="https://diceshock.cloudflareaccess.com/cdn-cgi/access/logout"
                className="gap-12"
              >
                <SignOutIcon className="size-6" />
                登出
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
