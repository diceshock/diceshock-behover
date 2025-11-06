import { HonoCtxEnv } from "@/shared/types";
import { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";

export default function themeGet(c: Context<HonoCtxEnv>) {
    const theme = getCookie(c, "syft-theme");
    if (!theme) setCookie(c, "syft-theme", "light");

    return [
        <div className="size-0 opacity-0 overflow-hidden pointer-events-none">
            <input
                value="light"
                type="checkbox"
                id="syft-theme-controller"
                defaultChecked={theme === "light" || !theme}
                className="theme-controller"
            />
        </div>,
        theme,
    ] as const;
}
