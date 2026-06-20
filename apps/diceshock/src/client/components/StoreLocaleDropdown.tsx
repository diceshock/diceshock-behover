import { useLocation } from "@tanstack/react-router";
import { useCallback, useEffect, useRef } from "react";
import { useStoreContext } from "@/client/hooks/useStoreContext";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  buildStoreLocalePrefix,
  LOCALES,
  type LocaleCode,
  STORES,
  type StoreCode,
} from "@/shared/store-locale";

interface StoreLocaleDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

function StoreLocaleDropdown({ isOpen, onClose }: StoreLocaleDropdownProps) {
  const { locale } = useTranslation();
  const { storeCode } = useStoreContext();
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    // Delay listener registration to prevent the opening click from immediately closing
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

  const navigateTo = (store: StoreCode, loc: LocaleCode) => {
    const rest = getRestOfPath();
    const prefix = buildStoreLocalePrefix(store, loc);
    window.location.href = `/${prefix}/${rest}`;
  };

  const navigateHome = () => {
    const prefix = buildStoreLocalePrefix(storeCode, locale);
    window.location.href = `/${prefix}/`;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute left-0 top-full mt-1 z-[60] w-64 rounded-lg bg-base-100 shadow-xl border border-base-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="px-3 py-2 border-b border-base-200">
        <button
          type="button"
          onClick={navigateHome}
          className="w-full text-left px-2 py-1.5 rounded-md hover:bg-base-200 transition-colors text-sm font-medium"
        >
          🏠 回到主页
        </button>
      </div>

      <div className="px-3 py-2 border-b border-base-200">
        <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1 px-2">
          Languages
        </h3>
        <div className="grid grid-cols-2 gap-0.5">
          {(Object.values(LOCALES) as Array<(typeof LOCALES)[LocaleCode]>).map(
            (entry) => (
              <button
                key={entry.code}
                type="button"
                onClick={() => navigateTo(storeCode, entry.code)}
                className={`text-left px-2 py-1 rounded text-sm transition-colors ${
                  entry.code === locale
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-base-200 text-base-content"
                }`}
              >
                {entry.code === locale && (
                  <span className="mr-1 text-primary">✓</span>
                )}
                {entry.name}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="px-3 py-2">
        <h3 className="text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-1 px-2">
          Stores
        </h3>
        <div className="space-y-0.5">
          {(Object.values(STORES) as Array<(typeof STORES)[StoreCode]>).map(
            (entry) => (
              <button
                key={entry.code}
                type="button"
                onClick={() => navigateTo(entry.code, locale)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                  entry.code === storeCode
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-base-200 text-base-content"
                }`}
              >
                {entry.name}
                {entry.code === storeCode && (
                  <span className="ml-1.5 text-xs text-primary/70">[当前]</span>
                )}
              </button>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default StoreLocaleDropdown;
