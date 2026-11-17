import { ArrowLeftIcon, ScanIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Link,
  useLocation,
  useMatches,
  useRouter,
} from "@tanstack/react-router";
import clsx from "clsx";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashNavMenuButton } from "@/client/components/diceshock/DashNavMenu";
import DashQRScannerDialog from "@/client/components/diceshock/DashQRScannerDialog";
import { useRouteFilters } from "@/client/hooks/useRouteFilters";
import { useTranslation } from "@/client/hooks/useTranslation";
import type { TranslationKey } from "@/shared/i18n";
import { launcherOpenAtom, launcherToggleAtom } from "./launcher/atoms";
import { getCategoryByRoute } from "./launcher/categories";

/** Maps URL path segments to dashNav translation keys */
const SEGMENT_LABEL_KEY: Record<string, TranslationKey> = {
  users: "dashNav.users",
  actives: "dashNav.actives",
  trpg: "dashNav.trpg",
  "trpg-hosts": "trpgOps.hosts",
  "trpg-members": "trpgOps.members",
  "trpg-services": "trpgOps.services",
  "trpg-rewards": "trpgOps.rewards",
  "trpg-mailbox": "trpgOps.mailbox",
  events: "dashNav.events",
  tables: "dashNav.tables",
  orders: "dashNav.orders",
  gsz: "dashNav.mahjong",
  pricing: "dashNav.pricing",
  media: "dashNav.media",
  "wechat-menu": "dashNav.wechatMenu",
};

export function DashHeader() {
  const router = useRouter();
  const matches = useMatches();
  const { t } = useTranslation();
  const [qrOpen, setQrOpen] = useState(false);
  const launcherOpen = useAtomValue(launcherOpenAtom);
  const toggleLauncher = useSetAtom(launcherToggleAtom);
  const location = useLocation();
  // Chips come from URL search params, NOT launcher atoms
  const { filters, query: routeQuery, categoryId } = useRouteFilters();
  const category = categoryId
    ? getCategoryByRoute(`/dash/${categoryId}`)
    : getCategoryByRoute(location.pathname);

  // Ref for fresh filter state in stable keydown handler
  const filtersRef = useRef({
    filters,
    query: routeQuery,
    categoryId: categoryId ?? category?.id ?? null,
  });
  filtersRef.current = {
    filters,
    query: routeQuery,
    categoryId: categoryId ?? category?.id ?? null,
  };

  // Breadcrumbs from route matches
  const crumbs = matches
    .filter((m) => m.pathname !== "/" && m.pathname !== "/dash")
    .map((m) => {
      const segment = m.pathname.split("/").pop() ?? "";
      const key = SEGMENT_LABEL_KEY[segment];
      return { label: key ? t(key) : segment, path: m.pathname };
    });

  // Global Ctrl/Cmd+K hotkey to open launcher
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && !launcherOpen) {
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
            <Link
              to="/dash"
              className="hover:text-base-content transition-colors"
            >
              {t("dashNav.dashboard")}
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

        {/* Center: 搜索入口已移除，保留 Ctrl/Cmd+K 快捷键唤起命令面板 */}
        <div className="flex-1" />

        {/* Right: QR scan */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className="btn btn-ghost btn-square btn-sm"
          >
            <ScanIcon className="size-4" />
          </button>
        </div>
      </header>

      <DashQRScannerDialog isOpen={qrOpen} onClose={() => setQrOpen(false)} />
    </>
  );
}
