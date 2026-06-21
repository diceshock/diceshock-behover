import type { Context } from "hono";
import { isValidLocale, type LocaleCode } from "@/shared/store-locale";
import type { HonoCtxEnv } from "@/shared/types";

const CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

const WEIGHT_STRING =
  "0,200;0,300;0,400;0,600;0,700;1,200;1,300;1,400;1,600;1,700";

const CACHE_CONTROL = "public, max-age=31536000, immutable";

const LOCALE_TO_FAMILY: Record<LocaleCode, string> = {
  zh_Hans: "Noto+Sans+SC",
  zh_Hant: "Noto+Sans+TC",
  ja: "Noto+Sans+JP",
  en: "Inter",
  de: "Inter",
  fr: "Inter",
  es: "Inter",
  pt: "Inter",
  ru: "Inter",
};

export async function fontCss(c: Context<HonoCtxEnv>) {
  const localeParam = c.req.param("locale").replace(/\.css$/, "");

  if (!isValidLocale(localeParam)) {
    return c.text("Unknown font locale", 404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
  }

  const family = LOCALE_TO_FAMILY[localeParam];
  const css = await fetchGoogleFontCss(family);
  const rewritten = rewriteFontCss(css, family.replace(/\+/g, " "));

  return c.text(rewritten, 200, {
    "Content-Type": "text/css; charset=utf-8",
    "Cache-Control": CACHE_CONTROL,
    "CDN-Cache-Control": CACHE_CONTROL,
  });
}

async function fetchGoogleFontCss(family: string): Promise<string> {
  const url = `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${WEIGHT_STRING}&display=swap`;
  const resp = await fetch(url, {
    headers: { "User-Agent": CHROME_UA },
    cf: { cacheEverything: true, cacheTtl: 86400 * 365 },
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} fetching CSS for ${family}`);
  }

  return resp.text();
}

function rewriteFontCss(css: string, googleFamilyName: string): string {
  const familyPattern = new RegExp(
    `font-family:\\s*(['"])${escapeRegExp(googleFamilyName)}\\1`,
    "g",
  );

  return css
    .replace(familyPattern, 'font-family: "DiceShock Sans"')
    .replace(/@font-face\s*\{([^}]*)\}/g, (block) => {
      if (block.includes("font-display")) return block;
      return block.replace(
        "@font-face {",
        "@font-face {\n  font-display: swap;",
      );
    });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
