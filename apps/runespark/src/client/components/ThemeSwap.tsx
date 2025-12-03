import { MoonIcon, SunIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { atom, useAtom } from "jotai";
import Cookie from "js-cookie";
import { useEffect } from "react";

export const themeA = atom(null as "light" | "dark" | null);

export default function ThemeSwap({
  className,
}: {
  className?: { outer?: string; icon?: string };
}) {
  const [theme, setTheme] = useAtom(themeA);

  useEffect(() => {
    if (typeof window === "undefined" || theme !== null) return;

    const input = document.getElementById(
      "syft-theme-controller",
    ) as HTMLInputElement;

    if (!input) return;

    setTheme(input.checked ? "light" : "dark");
  }, [theme, setTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || theme === null) return;

    const input = document.getElementById(
      "syft-theme-controller",
    ) as HTMLInputElement;

    if (!input) return;

    if (theme === "dark") {
      document.documentElement.classList.toggle("dark", true);
      input.checked = false;
    }

    if (theme === "light") {
      document.documentElement.classList.toggle("dark", false);
      input.checked = true;
    }

    Cookie.set("syft-theme", theme);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, [theme]);

  return (
    <label className={clsx("swap swap-rotate", className?.outer)}>
      <input
        type="checkbox"
        value="light"
        checked={theme === "light"}
        onChange={(evt) => {
          setTheme(evt.target.checked ? "light" : "dark");
        }}
      />

      <SunIcon
        className={clsx("size-full swap-off", className?.icon)}
        weight="fill"
      />

      <MoonIcon
        className={clsx("size-full swap-on", className?.icon)}
        weight="fill"
      />
    </label>
  );
}
