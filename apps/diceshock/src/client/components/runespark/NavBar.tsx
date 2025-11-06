import { ListIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import DiceshockTextLogo from "../icons/DiceshockTextLogo";
import ThemeSwap from "../ThemeSwap";

import clsx from "clsx";
import { MouseEventHandler, useState } from "react";
import useCrossData from "../../hooks/useCrossData";

export default function NavBar() {
    const { UserAgentMeta: serverData } = useCrossData() ?? {};

    const isKbd = serverData?.os === "mac" || serverData?.os === "windows";
    const ctrl = serverData?.os === "mac" ? "cmd" : "ctrl";

    const [isDropdownBelow, setIsDropdownBelow] = useState(false);

    const clickDropdown: MouseEventHandler = (evt) => {
        const { top } = (evt.target as HTMLElement).getBoundingClientRect();

        setIsDropdownBelow(top > window.innerHeight / 2);
    };

    return (
        <nav className="navbar bg-base-100 sticky top-0 z-50">
            <div className="navbar-start">
                <div
                    suppressHydrationWarning
                    onClick={clickDropdown}
                    className={clsx(
                        "dropdown dropdown-right",
                        isDropdownBelow ? "dropdown-top" : "dropdown-bottom"
                    )}
                >
                    <button
                        tabIndex={0}
                        role="button"
                        className="btn btn-ghost btn-circle"
                    >
                        <ListIcon />
                    </button>
                    <ul
                        tabIndex={0}
                        className="menu menu-sm dropdown-content bg-base-100 rounded-box z-1 mt-3 w-52 p-2 shadow"
                    >
                        <li>
                            <a>Homepage</a>
                        </li>
                        <li>
                            <a>Portfolio</a>
                        </li>
                        <li>
                            <a>About</a>
                        </li>
                    </ul>
                </div>
            </div>
            <div className="navbar-center">
                <a className="btn btn-ghost">
                    <DiceshockTextLogo className="w-40 text-base-content" />
                </a>
            </div>
            <div className="navbar-end gap-1">
                <button
                    className={clsx(
                        "btn btn-ghost",
                        isKbd ? "rounded-full" : "btn-circle"
                    )}
                >
                    <MagnifyingGlassIcon />
                    {isKbd && (
                        <>
                            <kbd className="kbd kbd-sm">{ctrl}</kbd>+
                            <kbd className="kbd kbd-sm">f</kbd>
                        </>
                    )}
                </button>

                <button className="btn btn-ghost btn-circle">
                    <ThemeSwap />
                </button>
            </div>
        </nav>
    );
}
