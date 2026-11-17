import { existsSync, readFileSync } from "node:fs";
import type { StoreMedia } from "../src/types/store-media.ts";

export type MiniappTarget = "local" | "release";

export interface MiniappBuildConfig {
  appId: string;
  apiOrigin: string;
  storeMedia: Record<string, StoreMedia>;
}

interface LocalConfigFile {
  appId?: string;
  apiOrigin?: string;
  storeMedia?: Record<string, StoreMedia>;
}

const LOCAL_API_ORIGIN = "http://127.0.0.1:5173";
const LOCAL_APP_ID = "touristappid";
const configFile = new URL("../config.local.json", import.meta.url);

function readLocalConfig(): LocalConfigFile {
  if (!existsSync(configFile)) return {};
  return JSON.parse(readFileSync(configFile, "utf8").replace(/^\uFEFF/, ""));
}

function validateMedia(media: Record<string, StoreMedia>) {
  for (const value of Object.values(media))
    for (const key of ["image", "cover"] as const) {
      const url = value[key];
      if (url && new URL(url).protocol !== "https:")
        throw new Error("门店图片必须使用 HTTPS");
    }
}

/**
 * `release`: requires a real HTTPS origin and WeChat appId from config.local.json.
 * `local`: talks to the local Worker dev server; never uploadable.
 */
export function loadMiniappConfig(target: MiniappTarget): MiniappBuildConfig {
  const file = readLocalConfig();
  const storeMedia = file.storeMedia ?? {};
  validateMedia(storeMedia);
  if (target === "local")
    return { appId: LOCAL_APP_ID, apiOrigin: LOCAL_API_ORIGIN, storeMedia };

  if (!file.apiOrigin)
    throw new Error("请在 config.local.json 配置正式 apiOrigin 和 appId");
  const origin = new URL(file.apiOrigin);
  if (
    origin.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "0.0.0.0", "example.com"].includes(
      origin.hostname,
    ) ||
    origin.hostname.endsWith(".test") ||
    origin.hostname.endsWith(".invalid")
  )
    throw new Error("正式构建需要真实 HTTPS API 域名");
  if (
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    origin.username ||
    origin.password
  )
    throw new Error("apiOrigin 必须是纯域名 origin");
  const appId = file.appId ?? "";
  if (!/^wx[0-9a-f]{16}$/.test(appId))
    throw new Error("正式构建需要配置真实微信 appId");
  return { appId, apiOrigin: origin.origin, storeMedia };
}
