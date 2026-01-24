import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  SignpostIcon,
  TagIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { trpcClientDash } from "@/shared/utils/trpc";
import InventoryManagementCard from "@/client/components/diceshock/InventoryManagementCard";

export const Route = createFileRoute("/dash/")({
  component: RouteComponent,
});

function RouteComponent() {
  const [stats, setStats] = useState<{
    users: {
      total: number;
      newLast30Days: number;
      newLast7Days: number;
    };
    actives: {
      total: number;
      published: number;
      newLast30Days: number;
      newLast7Days: number;
    };
  } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await trpcClientDash.dashboard.getStats.query();
        setStats(data);
      } catch (error) {
        console.error("获取统计数据失败", error);
      }
    };

    fetchStats();
  }, []);

  return (
    <main className="size-full p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 页面导航卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/dash/acitve"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <SignpostIcon className="size-8 text-primary" />
                </div>
                <div>
                  <h3 className="card-title text-lg">活动管理</h3>
                  <p className="text-sm text-base-content/60">
                    管理所有活动和约局
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/dash/game-tags"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <TagIcon className="size-8 text-secondary" />
                </div>
                <div>
                  <h3 className="card-title text-lg">约局标签</h3>
                  <p className="text-sm text-base-content/60">
                    管理约局标签和分类
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/dash/users"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-accent/10 rounded-lg">
                  <UsersIcon className="size-8 text-accent" />
                </div>
                <div>
                  <h3 className="card-title text-lg">用户管理</h3>
                  <p className="text-sm text-base-content/60">
                    查看和管理用户信息
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat bg-base-100 shadow-sm rounded-lg p-6">
            <div className="stat-title">注册用户总数</div>
            <div className="stat-value text-primary">
              {stats?.users.total ?? 0}
            </div>
            <div className="stat-desc">
              近7天新增: {stats?.users.newLast7Days ?? 0}
            </div>
          </div>

          <div className="stat bg-base-100 shadow-sm rounded-lg p-6">
            <div className="stat-title">活动总数</div>
            <div className="stat-value text-secondary">
              {stats?.actives.total ?? 0}
            </div>
            <div className="stat-desc">
              已发布: {stats?.actives.published ?? 0}
            </div>
          </div>

          <div className="stat bg-base-100 shadow-sm rounded-lg p-6">
            <div className="stat-title">近30天新增用户</div>
            <div className="stat-value text-accent">
              {stats?.users.newLast30Days ?? 0}
            </div>
            <div className="stat-desc">
              近7天: {stats?.users.newLast7Days ?? 0}
            </div>
          </div>

          <div className="stat bg-base-100 shadow-sm rounded-lg p-6">
            <div className="stat-title">近30天新增活动</div>
            <div className="stat-value text-info">
              {stats?.actives.newLast30Days ?? 0}
            </div>
            <div className="stat-desc">
              近7天: {stats?.actives.newLast7Days ?? 0}
            </div>
          </div>
        </div>

        {/* 库存管理卡片 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryManagementCard />
        </div>
      </div>
    </main>
  );
}