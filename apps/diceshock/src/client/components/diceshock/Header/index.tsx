import {
  CaretDownIcon,
  DownloadSimpleIcon,
  HouseIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import type React from "react";
import LongTextLogo from "@/client/assets/svg/black-simplify-with-text-logo.svg?react";
import logoSvgUrl from "@/client/assets/svg/black-simplify-with-text-logo.svg?url";
import { useCurrentStore } from "@/client/hooks/useStore";
import type { StoreId } from "@/shared/store";
import { STORE_LABELS, STORE_SHORT_LABELS, STORES } from "@/shared/store";
import AvatarMenu from "./AvataMenu";

type PageType = {
  title: React.ReactNode;
  /** 相对于 /$store 的子路径 */
  path?: string;
  children?: PageType[];
  spa?: boolean;
};

const PAGES: PageType[] = [
  { title: "立直麻将", path: "riichi" },
  { title: "库存", path: "inventory" },
  { title: "活动&约局", path: "actives" },
  { title: "DiceShock Agents©", path: "diceshock-agents" },
  { title: "联系我们", path: "contact-us" },
];

const getSideMenu = (pages: PageType[], store: StoreId) =>
  pages
    .map(({ title, path, children, spa = true }, i) => {
      if (children)
        return (
          <li key={i}>
            <span>{title}</span>
            <ul className="p-2">{getSideMenu(children, store)}</ul>
          </li>
        );

      if (path) {
        const href = `/${store}/${path}`;
        return (
          <li key={i}>
            {spa ? (
              <Link to={href as string}>{title}</Link>
            ) : (
              <a href={href}>{title}</a>
            )}
          </li>
        );
      }

      return void 0;
    })
    .filter(Boolean);

const getMidMenu = (pages: PageType[], store: StoreId) =>
  pages
    .map(({ title, path, children, spa = true }, i) => {
      if (children)
        return (
          <li key={i}>
            <details>
              <summary className="text-nowrap">{title}</summary>
              <ul className="p-2 mt-5!">{getMidMenu(children, store)}</ul>
            </details>
          </li>
        );

      if (path) {
        const href = `/${store}/${path}`;
        return (
          <li key={i}>
            {spa ? (
              <Link to={href as string} className="text-nowrap mr-2">
                {title}
              </Link>
            ) : (
              <a href={href} className="text-nowrap mr-2">
                {title}
              </a>
            )}
          </li>
        );
      }

      return void 0;
    })
    .filter(Boolean);

function LogoMenu({ store }: { store: StoreId }) {
  const switchStore = (target: StoreId) => {
    const currentPath = window.location.pathname;
    const storePrefix = `/${store}`;
    const suffix = currentPath.startsWith(storePrefix)
      ? currentPath.slice(storePrefix.length)
      : "";
    window.location.href = `/${target}${suffix || "/"}`;
  };

  return (
    <div className="dropdown">
      <div tabIndex={0} role="button" className="btn btn-ghost px-0 relative">
        <LongTextLogo className="h-full" />
        <span className="absolute top-0 left-16 badge badge-xs badge-primary text-primary-content text-[10px] leading-none px-1">
          {STORE_SHORT_LABELS[store]}
        </span>
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-1 mt-3 w-48 p-2 shadow-lg"
      >
        <li>
          <Link to="/$store" params={{ store }}>
            <HouseIcon className="size-4" />
            回到主页
          </Link>
        </li>
        <li className="menu-title text-xs text-base-content/50 pt-2">
          切换店铺
        </li>
        {STORES.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => switchStore(s)}
              disabled={s === store}
              className={s === store ? "active" : ""}
            >
              <StorefrontIcon className="size-4" />
              {STORE_LABELS[s]}
            </button>
          </li>
        ))}
        <li className="mt-1 border-t border-base-200 pt-1">
          <a href={logoSvgUrl} download="diceshock-logo.svg">
            <DownloadSimpleIcon className="size-4" />
            下载 Logo
          </a>
        </li>
      </ul>
    </div>
  );
}

const Header = () => {
  const store = useCurrentStore();

  return (
    <header className="sticky w-full top-0 left-0 z-50">
      <nav className="navbar bg-base-100/70 backdrop-blur-xl">
        <div className="navbar-start gap-1">
          <div className="dropdown">
            <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
              <CaretDownIcon className="h-5 w-5" />
            </div>
            <ul
              tabIndex={0}
              className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
            >
              {getSideMenu(PAGES, store)}
            </ul>
          </div>

          <LogoMenu store={store} />
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">
            {getMidMenu(PAGES, store)}
          </ul>
        </div>

        <div className="navbar-end pr-2">
          <AvatarMenu />
        </div>
      </nav>
    </header>
  );
};

export default Header;
