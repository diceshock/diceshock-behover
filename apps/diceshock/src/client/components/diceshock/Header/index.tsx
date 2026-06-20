import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import LongTextLogo from "@/client/assets/svg/black-simplify-with-text-logo.svg?react";
import StoreLocaleDropdown from "@/client/components/StoreLocaleDropdown";
import useCrossData from "@/client/hooks/useCrossData";
import { useStoreContext } from "@/client/hooks/useStoreContext";
import { useTranslation } from "@/client/hooks/useTranslation";
import { STORES } from "@/shared/store-locale";
import AvatarMenu from "./AvataMenu";

type PageType = {
  title: React.ReactNode;
  href?: string;
  children?: PageType[];
  spa?: boolean; // 默认为 true，为 false 时使用 a 标签跳转
};

const getSideMenu = (pages: PageType[]) =>
  pages
    .map(({ title, href, children, spa = true }, i) => {
      if (children)
        return (
          <li key={i}>
            <span>{title}</span>
            <ul className="p-2">{getSideMenu(children)}</ul>
          </li>
        );

      if (href)
        return (
          <li key={i}>
            {spa ? <Link to={href}>{title}</Link> : <a href={href}>{title}</a>}
          </li>
        );

      return void 0;
    })
    .filter(Boolean);

const getMidMenu = (pages: PageType[]) =>
  pages
    .map(({ title, href, children, spa = true }, i) => {
      if (children)
        return (
          <li key={i}>
            <details>
              <summary className="text-nowrap">{title}</summary>
              <ul className="p-2 mt-5!">{getMidMenu(children)}</ul>
            </details>
          </li>
        );

      if (href)
        return (
          <li key={i}>
            {spa ? (
              <Link to={href} className="text-nowrap mr-2">
                {title}
              </Link>
            ) : (
              <a href={href} className="text-nowrap mr-2">
                {title}
              </a>
            )}
          </li>
        );

      return void 0;
    })
    .filter(Boolean);

function Header() {
  const crossData = useCrossData();
  const { storeCode } = useStoreContext();
  const { t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const PAGES: PageType[] = useMemo(
    () => [
      { title: t("headerNav.riichi"), href: `/riichi` },
      { title: t("headerNav.inventory"), href: `/inventory` },
      { title: t("headerNav.actives"), href: `/actives` },
      { title: t("headerNav.agents"), href: `/diceshock-agents` },
      { title: t("headerNav.contact"), href: `/contact-us` },
    ],
    [t],
  );

  const isInWechat = useMemo(() => {
    const ua =
      crossData?.UserAgentMeta?.userAgent ??
      (typeof navigator !== "undefined" ? navigator.userAgent : "");
    return /MicroMessenger/i.test(ua);
  }, [crossData?.UserAgentMeta?.userAgent]);

  const toggleDropdown = useCallback(() => {
    setDropdownOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setDropdownOpen(false);
  }, []);

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
              {getSideMenu(PAGES)}
            </ul>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={toggleDropdown}
              className="btn btn-ghost px-0"
            >
              <LongTextLogo className="h-full" />
              <span className="badge badge-sm badge-primary absolute -top-1 -right-2">
                {STORES[storeCode].shortName}
              </span>
            </button>
            <StoreLocaleDropdown
              isOpen={dropdownOpen}
              onClose={closeDropdown}
            />
          </div>
        </div>

        <div className="navbar-center hidden lg:flex">
          <ul className="menu menu-horizontal px-1">{getMidMenu(PAGES)}</ul>
        </div>

        <div className="navbar-end pr-2">
          <AvatarMenu />
        </div>
      </nav>
    </header>
  );
}

export default Header;
