import { useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { useUpdateMyPreferencesMutation } from "@/client/graphql/__generated__";
import { themeA } from "@/client/components/ThemeSwap";
import useAuth from "./useAuth";
import { DEFAULT_LOCALE, DEFAULT_STORE } from "@/shared/store-locale";

/**
 * Ensures user preferences (locale, store, theme) are always initialized.
 *
 * On first load:
 * - If preferred_locale is null → default to "zh_Hans"
 * - If preferred_store_id is null → default to "gg" (光谷店)
 * - If preferred_theme is null → default to system preference, or "light"
 *
 * Writes all three to the database so they're always populated.
 */
export default function usePreferenceInit() {
  const { userInfo, session } = useAuth();
  const [theme, setTheme] = useAtom(themeA);
  const [updateMyPreferences] = useUpdateMyPreferencesMutation();
  const didInit = useRef(false);

  useEffect(() => {
    if (didInit.current) return;
    if (!session?.user || !userInfo) return;

    const info = userInfo as Record<string, unknown>;
    const currentLocale = info.preferred_locale as string | null | undefined;
    const currentStore = info.preferred_store_id as string | null | undefined;
    const currentTheme = info.preferred_theme as string | null | undefined;

    // All set → nothing to do
    if (currentLocale && currentStore && currentTheme) {
      // Sync jotai atom with DB theme
      if (theme === null && (currentTheme === "light" || currentTheme === "dark")) {
        setTheme(currentTheme);
      }
      return;
    }

    didInit.current = true;

    // Compute defaults
    const resolvedLocale = currentLocale || DEFAULT_LOCALE;
    const resolvedStore = currentStore || DEFAULT_STORE;
    let resolvedTheme = currentTheme;
    if (!resolvedTheme) {
      // Detect system preference, fallback to light
      if (typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        resolvedTheme = "dark";
      } else {
        resolvedTheme = "light";
      }
    }

    // Sync jotai atom
    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      setTheme(resolvedTheme);
    }

    // Persist to DB
    updateMyPreferences({
      variables: {
        input: {
          preferredLocale: resolvedLocale,
          preferredStoreId: resolvedStore,
          preferredTheme: resolvedTheme,
        },
      },
    }).catch((e) => {
      console.error("[usePreferenceInit] failed to save defaults", e);
    });
  }, [session, userInfo, theme, setTheme, updateMyPreferences]);
}
