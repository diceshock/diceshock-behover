import {
  CheckIcon,
  HouseIcon,
  TranslateIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUpdateMyPreferencesMutation } from "@/client/graphql/__generated__";
import useAuth from "@/client/hooks/useAuth";
import { useStoreContext } from "@/client/hooks/useStoreContext";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  buildStoreLocalePrefix,
  type LocaleCode,
  STORES,
  type StoreCode,
} from "@/shared/store-locale";
import LanguageSelectorModal from "./LanguageSelectorModal";

interface StoreLocaleDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

function StoreLocaleDropdown({ isOpen, onClose }: StoreLocaleDropdownProps) {
  const { locale } = useTranslation();
  const { storeCode } = useStoreContext();
  const { session } = useAuth();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [langModalOpen, setLangModalOpen] = useState(false);

  const [updateMyPreferences] = useUpdateMyPreferencesMutation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const timer = setTimeout(
      () => document.addEventListener("mousedown", handleClick),
      0,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [isOpen, onClose]);

  const getRestOfPath = useCallback(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    return segments.length > 1 ? segments.slice(1).join("/") : "";
  }, [location.pathname]);

  const navigateTo = useCallback(
    async (store: StoreCode, loc: LocaleCode) => {
      const rest = getRestOfPath();
      const prefix = buildStoreLocalePrefix(store, loc);
      const target = `/${prefix}/${rest}`;

      if (session?.user) {
        try {
          await updateMyPreferences({
            variables: {
              input: {
                preferredLocale: loc,
                preferredStoreId: store,
              },
            },
          });
        } catch {}
      }

      window.location.href = target;
    },
    [session, getRestOfPath, updateMyPreferences],
  );

  const navigateHome = useCallback(() => {
    const prefix = buildStoreLocalePrefix(storeCode, locale);
    window.location.href = `/${prefix}/`;
  }, [storeCode, locale]);

  const handleLocaleSelect = useCallback(
    (loc: LocaleCode) => {
      navigateTo(storeCode, loc);
    },
    [storeCode, navigateTo],
  );

  if (!isOpen) return null;

  return (
    <>
      <div
        ref={dropdownRef}
        className="absolute left-0 top-full mt-1 z-[60] w-56 rounded-lg bg-base-100 shadow-xl border border-base-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="px-2 py-1.5">
          <button
            type="button"
            onClick={navigateHome}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md hover:bg-base-200 transition-colors text-sm font-medium"
          >
            <HouseIcon className="size-4 shrink-0" weight="bold" />
            <span>回到主页</span>
          </button>

          <button
            type="button"
            onClick={() => setLangModalOpen(true)}
            className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md hover:bg-base-200 transition-colors text-sm font-medium"
          >
            <TranslateIcon className="size-4 shrink-0" weight="bold" />
            <span>Languages</span>
          </button>
        </div>

        <div className="border-t border-base-200" />

        <div className="px-2 py-1.5">
          {(Object.values(STORES) as Array<(typeof STORES)[StoreCode]>).map(
            (entry) => {
              const isCurrent = entry.code === storeCode;
              return (
                <button
                  key={entry.code}
                  type="button"
                  onClick={() => navigateTo(entry.code, locale)}
                  className={clsx(
                    "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-sm transition-colors",
                    isCurrent
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-base-200 text-base-content",
                  )}
                >
                  <span className="w-4 shrink-0 flex items-center justify-center">
                    {isCurrent && (
                      <CheckIcon className="size-3.5" weight="bold" />
                    )}
                  </span>
                  <span>{entry.name}</span>
                </button>
              );
            },
          )}
        </div>
      </div>

      <LanguageSelectorModal
        isOpen={langModalOpen}
        onClose={() => setLangModalOpen(false)}
        currentLocale={locale}
        onSelect={handleLocaleSelect}
      />
    </>
  );
}

export default StoreLocaleDropdown;
