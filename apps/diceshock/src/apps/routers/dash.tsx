import {
  GaugeIcon,
  SignOutIcon,
  SignpostIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import {
  ClientOnly,
  createFileRoute,
  Link,
  Outlet,
} from "@tanstack/react-router";
import ThemeSwap from "@/client/components/ThemeSwap";

export const Route = createFileRoute("/dash")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ClientOnly>
      {/* 侧边栏 - 大屏幕显示，小屏幕隐藏 */}
      <aside className="hidden lg:block fixed w-20 hover:w-auto h-screen bg-secondary overflow-hidden z-50">
        <ul className="menu menu-xl rounded-none bg-base-200 rounded-box w-56 h-screen">
          <li>
            <Link to="/dash" className="gap-12">
              <GaugeIcon className="size-6" />
              仪表盘
            </Link>
          </li>

          <li>
            <Link to="/dash/acitve" className="gap-12">
              <SignpostIcon className="size-6" />
              活动
            </Link>
          </li>

          <li>
            <Link to="/dash/game-tags" className="gap-12">
              <TagIcon className="size-6" />
              标签
            </Link>
          </li>

          <li>
            <Link to="/dash/users" className="gap-12">
              <UsersIcon className="size-6" />
              用户
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
              href="https://diceshock.cloudflareaccess.com/cdn-cgi/access/logout"
              className="gap-12"
            >
              <SignOutIcon />
              登出
            </a>
          </li>
        </ul>
      </aside>

      <main className="flex min-h-screen lg:pl-20">
        <Outlet />
      </main>
    </ClientOnly>
  );
}
