import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@tanstack/react-router";
import type React from "react";
import LongTextLogo from "@/client/assets/svg/black-simplify-with-text-logo.svg?react";
import ThemeSwap from "@/client/components/ThemeSwap";

type PageType = {
  title: React.ReactNode;
  href?: string;
  children?: PageType[];
  spa?: boolean; // 默认为 true，为 false 时使用 a 标签跳转
};

const PAGES: PageType[] = [
  {
    title: "库存",
    href: `/inventory`,
  },
  {
    title: "活动",
    href: `/actives`,
  },
  {
    title: "DiceShock Agents©",
    href: `/diceshock-agents`,
  },
  {
    title: "联系我们",
    href: `/contact-us`,
    
  },
];

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
            {spa ? (
              <Link to={href}>{title}</Link>
            ) : (
              <a href={href}>{title}</a>
            )}
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

const Header = () => (
  <header className="sticky w-full top-0 left-0 z-50">
    <nav className="navbar bg-base-100/70 backdrop-blur-xl">
      <div className="navbar-start gap-1">
        <div className="dropdown">
          <div tabIndex={0} role="button" className="btn btn-ghost lg:hidden">
            <CaretDownIcon className="h-5 w-5" />
          </div>
          <ul
            tabIndex={0}
            className="menu menu-sm dropdown-content bg-base-100 rounded-box z-[1] mt-3 w-52 p-2 shadow"
          >
            {getSideMenu(PAGES)}
          </ul>
        </div>

        <Link to="/" className="btn btn-ghost px-0">
          <LongTextLogo className="h-full" />
        </Link>
      </div>

      <div className="navbar-center hidden lg:flex">
        <ul className="menu menu-horizontal px-1">{getMidMenu(PAGES)}</ul>
      </div>

      <div className="navbar-end gap-2 pr-2">
        <ThemeSwap
          className={{ outer: "btn btn-circle btn-ghost", icon: "w-5" }}
        />

        {/* <Link to="/agent" className="btn btn-ghost rounded-full pl-1">
                    <div className="avatar size-8 avatar-placeholder">
                        <div className="bg-primary text-gray-900 w-16 rounded-full">
                            <span className="text-lg">Jo</span>
                        </div>
                    </div>

                    <p className="max-w-20 truncate">John 117</p>
                </Link> */}
      </div>
    </nav>
  </header>
);

export default Header;
