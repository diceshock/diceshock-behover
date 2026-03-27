import {
  ClientOnly,
  createFileRoute,
  Link,
  Outlet,
} from "@tanstack/react-router";
import DashNavDrawer from "@/client/components/diceshock/DashNavMenu";

export const Route = createFileRoute("/dash")({
  component: RouteComponent,
  notFoundComponent: DashNotFound,
  errorComponent: DashError,
});

function RouteComponent() {
  return (
    <ClientOnly>
      <DashNavDrawer>
        <Outlet />
      </DashNavDrawer>
    </ClientOnly>
  );
}

function DashNotFound() {
  return (
    <main className="fixed inset-0 z-[100] bg-base-100 p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-screen">
        <p className="font-mono font-black text-[20vw] md:text-[14vw] lg:text-[10rem] leading-none text-primary/20 select-none">
          404
        </p>

        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold -mt-2 md:-mt-4 lg:-mt-6">
          来到了不存在的地方
        </h1>

        <p className="mt-3 text-base-content/60 text-sm max-w-sm text-center">
          该后台页面不存在或已被移除。
        </p>

        <Link to="/dash" className="btn btn-primary mt-6">
          返回仪表盘
        </Link>
      </div>
    </main>
  );
}

function DashError({ error }: { error: unknown }) {
  const message =
    error instanceof Error ? error.message : "发生了未知错误，请稍后再试。";

  return (
    <main className="fixed inset-0 z-[100] bg-base-100 p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto flex flex-col items-center justify-center min-h-screen">
        <p className="font-mono font-black text-[20vw] md:text-[14vw] lg:text-[10rem] leading-none text-error/20 select-none">
          500
        </p>

        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold -mt-2 md:-mt-4 lg:-mt-6">
          好像发生了错误
        </h1>

        <p className="mt-3 text-base-content/60 text-sm max-w-sm text-center">
          后台遇到了意外问题，我们正在努力修复中。
        </p>

        <div className="mt-4 w-full max-w-lg">
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-sm font-medium text-base-content/50">
              错误详情
            </div>
            <div className="collapse-content">
              <pre className="text-xs text-error whitespace-pre-wrap break-all overflow-auto max-h-40">
                {message}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link to="/dash" className="btn btn-primary">
            返回仪表盘
          </Link>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn btn-ghost"
          >
            刷新页面
          </button>
        </div>
      </div>
    </main>
  );
}
