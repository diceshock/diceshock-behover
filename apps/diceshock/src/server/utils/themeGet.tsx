import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import type { StoreId } from "@/shared/store";
import { DEFAULT_STORE, isValidStore } from "@/shared/store";
import type { HonoCtxEnv } from "@/shared/types";

export default function themeGet(c: Context<HonoCtxEnv>) {
  const mode = getCookie(c, "syft-theme") as "light" | "dark" | undefined;
  if (!mode) setCookie(c, "syft-theme", "dark");

  const effectiveMode = mode || "dark";

  // 从 URL 路径提取 store
  const pathSegments = new URL(c.req.url).pathname.split("/").filter(Boolean);
  let store: StoreId = DEFAULT_STORE;
  if (pathSegments[0] && isValidStore(pathSegments[0])) {
    store = pathSegments[0];
  } else if (
    pathSegments[0] === "dash" &&
    pathSegments[1] &&
    isValidStore(pathSegments[1])
  ) {
    store = pathSegments[1];
  }

  const themeName = `${store}-${effectiveMode}`;

  return [
    <div
      key="theme"
      className="size-0 opacity-0 overflow-hidden pointer-events-none"
    >
      <input
        value={themeName}
        type="checkbox"
        id="syft-theme-controller"
        defaultChecked={effectiveMode === "light"}
        className="theme-controller"
      />
    </div>,
    effectiveMode,
    store,
  ] as const;
}
