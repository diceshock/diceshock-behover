import {
  ClientOnly,
  createFileRoute,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { DashHeader } from "@/client/components/dash/DashHeader";
import { Launcher } from "@/client/components/dash/launcher";
import ChatPanel from "@/client/components/dash/ChatPanel";
import MobileChatSheet from "@/client/components/dash/MobileChatSheet";
import DashNavDrawer from "@/client/components/diceshock/DashNavMenu";
import { useTranslation } from "@/client/hooks/useTranslation";

class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export const Route = createFileRoute("/dash")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const res = await fetch("/api/auth/session");
    const session = (await res.json()) as { user?: { role?: string } };
    const role = session?.user?.role;
    if (role !== "admin" && role !== "staff") {
      throw new ForbiddenError();
    }
  },
  component: RouteComponent,
  notFoundComponent: DashNotFound,
  errorComponent: DashError,
});

function RouteComponent() {
  return (
    <ClientOnly>
      <DashNavDrawer>
        <DashHeader />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Outlet />
        </main>
      </DashNavDrawer>
      <Launcher />
      <ChatPanel />
      <MobileChatSheet />
    </ClientOnly>
  );
}

function DashNotFound() {
  const { t } = useTranslation();

  return (
    <main className="fixed inset-0 z-[100] bg-base-100 p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-screen">
        <p className="font-mono font-black text-[20vw] md:text-[14vw] lg:text-[10rem] leading-none text-primary/20 select-none">
          404
        </p>

        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold -mt-2 md:-mt-4 lg:-mt-6">
          {t("dashLayout.notFoundTitle")}
        </h1>

        <p className="mt-3 text-base-content/60 text-sm max-w-sm text-center">
          {t("dashLayout.notFoundDesc")}
        </p>

        <Link to="/dash" className="btn btn-primary mt-6">
          {t("dashLayout.backToDashboard")}
        </Link>
      </div>
    </main>
  );
}

function DashError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  const isForbidden = error instanceof ForbiddenError;

  const code = isForbidden ? "403" : "500";
  const title = isForbidden
    ? t("dashLayout.forbiddenTitle")
    : t("dashLayout.errorTitle");
  const description = isForbidden
    ? t("dashLayout.forbiddenDesc")
    : t("dashLayout.errorDesc");
  const codeColor = isForbidden ? "text-warning/20" : "text-error/20";

  return (
    <main className="fixed inset-0 z-[100] bg-base-100 p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-screen">
        <p
          className={`font-mono font-black text-[20vw] md:text-[14vw] lg:text-[10rem] leading-none select-none ${codeColor}`}
        >
          {code}
        </p>

        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold -mt-2 md:-mt-4 lg:-mt-6">
          {title}
        </h1>

        <p className="mt-3 text-base-content/60 text-sm max-w-sm text-center">
          {description}
        </p>

        {!isForbidden && (
          <div className="mt-4 w-full max-w-lg">
            <div className="collapse collapse-arrow bg-base-200">
              <input type="checkbox" />
              <div className="collapse-title text-sm font-medium text-base-content/50">
                {t("dashLayout.errorDetails")}
              </div>
              <div className="collapse-content">
                <pre className="text-xs text-error whitespace-pre-wrap break-all overflow-auto max-h-40">
                  {error instanceof Error
                    ? error.message
                    : t("dashLayout.unknownError")}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a href="/" className="btn btn-primary">
            {t("dashLayout.backToHome")}
          </a>

          {!isForbidden && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="btn btn-ghost"
            >
              {t("dashLayout.refreshPage")}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
