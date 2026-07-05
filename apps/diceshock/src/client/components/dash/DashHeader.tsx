import {
  ArrowLeftIcon,
  QrCodeIcon,
  StorefrontIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Link, useMatches, useRouter } from "@tanstack/react-router";
import clsx from "clsx";
import { useAtom, useSetAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { DashNavMenuButton } from "@/client/components/diceshock/DashNavMenu";
import DashQRScannerDialog from "@/client/components/diceshock/DashQRScannerDialog";
import StoreSelectorModal from "@/client/components/StoreSelectorModal";
import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { STORES } from "@/shared/store-locale";
import { launcherOpenAtom, launcherToggleAtom } from "./launcher/atoms";

export function DashHeader() {
  const router = useRouter();
  const matches = useMatches();
  const { storeFilter, setStoreFilter } = useAdminStoreFilter();
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [launcherOpen] = useAtom(launcherOpenAtom);
  const toggleLauncher = useSetAtom(launcherToggleAtom);

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
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        toggleLauncher();
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
        <div className="flex-1 flex justify-center">
          <button
            type="button"
            onClick={() => toggleLauncher()}
            className={clsx(
              "flex items-center gap-2 h-7 px-3 rounded-lg",
              "bg-base-200/60 border border-base-300/50",
              "text-xs text-base-content/50 hover:text-base-content/80",
              "transition-all hover:bg-base-200",
              "max-w-48 w-full",
            )}
          >
            <span className="truncate flex-1 text-left">搜索…</span>
            <kbd className="kbd kbd-xs">/</kbd>
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
            <QrCodeIcon className="size-4" />
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
