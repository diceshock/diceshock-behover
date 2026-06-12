import { MoonIcon, SunIcon } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { atom, useAtom } from "jotai";
import Cookie from "js-cookie";
import { useEffect } from "react";
import { useCurrentStore } from "@/client/hooks/useStore";
import type { StoreId } from "@/shared/store";

export const themeA = atom(null as "light" | "dark" | null);

function getThemeName(store: StoreId, mode: "light" | "dark") {
  return `${store}-${mode}`;
}

function applyTheme(store: StoreId, mode: "light" | "dark") {
  if (typeof document === "undefined") return;
  const themeName = getThemeName(store, mode);
  document.documentElement.setAttribute("data-theme", themeName);
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export default function ThemeSwap({
  className,
}: {
  className?: { outer?: string; icon?: string };
}) {
  const [theme, setTheme] = useAtom(themeA);
  const store = useCurrentStore();

  useEffect(() => {
    if (typeof window === "undefined" || theme !== null) return;

    const saved = Cookie.get("syft-theme") as "light" | "dark" | undefined;
    setTheme(saved || "dark");
  }, [theme, setTheme]);

  useEffect(() => {
    if (typeof window === "undefined" || theme === null) return;

    applyTheme(store, theme);
    Cookie.set("syft-theme", theme);
  }, [theme, store]);

  return (
    <label className={clsx("swap swap-rotate", className?.outer)}>
      <input
        type="checkbox"
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
