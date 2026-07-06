import {
  ArrowLeftIcon,
  ScanIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link, useLocation, useMatches, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashNavMenuButton } from "@/client/components/diceshock/DashNavMenu";
import DashQRScannerDialog from "@/client/components/diceshock/DashQRScannerDialog";
import StoreSelectorModal from "@/client/components/StoreSelectorModal";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { useRouteFilters } from "@/client/hooks/useRouteFilters";
import { STORES } from "@/shared/store-locale";
import { launcherOpenAtom, launcherToggleAtom } from "./launcher/atoms";
import { getCategoryByRoute } from "./launcher/categories";
import { formatFilterChipLabel } from "./launcher/types";

export function DashHeader() {
  const router = useRouter();
  const matches = useMatches();
  const { storeFilter, setStoreFilter } = useAdminStoreFilter();
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const launcherOpen = useAtomValue(launcherOpenAtom);
  const toggleLauncher = useSetAtom(launcherToggleAtom);
  const location = useLocation();

  // Chips come from URL search params, NOT launcher atoms
  const { filters, query: routeQuery, categoryId } = useRouteFilters();
  const category = categoryId
    ? getCategoryByRoute("/dash/" + categoryId)
    : getCategoryByRoute(location.pathname);
  const hasFilters = filters.length > 0 || !!category;

  // Ref for fresh filter state in stable keydown handler
  const filtersRef = useRef({ filters, query: routeQuery, categoryId: categoryId ?? category?.id ?? null });
  filtersRef.current = { filters, query: routeQuery, categoryId: categoryId ?? category?.id ?? null };

  // Breadcrumbs from route matches
  const crumbs = matches
    .filter((m) => m.pathname !== "/" && m.pathname !== "/dash")
    .map((m) => ({
      label: m.pathname.split("/").pop() ?? "",
      path: m.pathname,
    }));

  // Global "/" hotkey to open launcher
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !launcherOpen) {
        const el = e.target;
        if (el instanceof HTMLElement) {
          const tag = el.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        }
        e.preventDefault();
        toggleLauncher(filtersRef.current);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [launcherOpen, toggleLauncher]);

  const goBack = useCallback(() => {
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/dash" });
  }, [router]);

  const storeName = STORES[storeFilter]?.shortName ?? storeFilter;

  return (
    <>
      <header
        className={clsx(
          "sticky top-0 z-30 flex h-12 items-center gap-2 px-3",
          "border-b border-base-300/50 bg-base-100/80 backdrop-blur-sm",
        )}
      >
        {/* Left: back + hamburger + breadcrumbs */}
        <div className="flex items-center gap-1 min-w-0 shrink-0">
          <button
            type="button"
            onClick={goBack}
            className="btn btn-ghost btn-square btn-sm"
          >
            <ArrowLeftIcon className="size-4" />
          </button>
          <DashNavMenuButton />
          <nav className="hidden sm:flex items-center gap-1 text-xs text-base-content/60 min-w-0">
            <Link to="/dash" className="hover:text-base-content transition-colors">
              Dash
            </Link>
            {crumbs.map((c) => (
              <span key={c.path} className="flex items-center gap-1">
                <span>/</span>
                <Link
                  to={c.path}
                  className="hover:text-base-content transition-colors truncate max-w-20"
                >
                  {c.label}
                </Link>
              </span>
            ))}
          </nav>
        </div>

        {/* Center: launcher trigger */}
        <div className="flex-1 flex justify-center min-w-0">
          <button
            type="button"
            onClick={() => toggleLauncher({ filters, query: routeQuery, categoryId: categoryId ?? category?.id ?? null })}
            className={clsx(
              "flex items-center gap-1.5 h-7 rounded-lg",
              "bg-base-200/60 border border-base-300/50",
              "text-xs text-base-content/50 hover:text-base-content/80",
              "transition-all hover:bg-base-200",
              "max-w-64 w-full min-w-0",
              hasFilters ? "px-1.5" : "px-3",
            )}
          >
            {hasFilters ? (
              <div className="flex-1 min-w-0 flex items-center overflow-x-auto scrollbar-none gap-1">
                {category && (
                  <span className="shrink-0 inline-flex items-center h-4 px-1.5 rounded bg-base-content/8 text-[10px] font-medium text-base-content/70">
                    {category.label}
                  </span>
                )}
                {filters.map((f) => (
                  <span
                    key={`${f.key}:${f.operator}`}
                    className="shrink-0 inline-flex items-center h-4 px-1.5 rounded bg-primary/10 text-[10px] text-primary"
                  >
                    {formatFilterChipLabel(f, category)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="truncate flex-1 text-left">搜索, 排序和筛选</span>
            )}
            <kbd className="kbd kbd-xs shrink-0">/</kbd>
          </button>
        </div>

        {/* Right: store switch + QR scan */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setStoreModalOpen(true)}
            className="btn btn-ghost btn-xs gap-1"
          >
            <StorefrontIcon className="size-3.5" />
            <span className="hidden sm:inline text-xs">{storeName}</span>
          </button>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="btn btn-ghost btn-square btn-sm"
          >
            <ScanIcon className="size-4" />
          </button>
        </div>
      </header>

      <StoreSelectorModal
        isOpen={storeModalOpen}
        onClose={() => setStoreModalOpen(false)}
        currentStore={storeFilter}
        onSelect={(s) => setStoreFilter(s as typeof storeFilter)}
      />
      <DashQRScannerDialog isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  );
}
