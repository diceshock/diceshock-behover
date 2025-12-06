import {
  GaugeIcon,
  GraphIcon,
  SignOutIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createLazyFileRoute, Link, Outlet } from "@tanstack/react-router";
import ThemeSwap from "@/client/components/ThemeSwap";

export const Route = createLazyFileRoute("/dash")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <aside className="fixed w-20 hover:w-auto h-screen bg-secondary overflow-hidden z-50">
        <ul className="menu menu-xl rounded-none bg-base-200 rounded-box w-56 h-screen">
          <li>
            <Link to="/dash" className="gap-12">
              <GaugeIcon className="size-6" />
              仪表盘
            </Link>
          </li>

          <li>
            <Link to="/dash/graphiql" className="gap-12">
              <GraphIcon className="size-6" />
              Graphi
            </Link>
          </li>

          <li className="mt-auto">
            <label className="gap-12">
              <ThemeSwap />
              主题
            </label>
          </li>

          <li>
            <a
              href="https://runespark.cloudflareaccess.com/cdn-cgi/access/logout"
              className="gap-12"
            >
              <SignOutIcon />
              登出
            </a>
          </li>
        </ul>
      </aside>

      <main className="flex min-h-screen pl-20">
        <Outlet />
      </main>
    </>
  );
}
