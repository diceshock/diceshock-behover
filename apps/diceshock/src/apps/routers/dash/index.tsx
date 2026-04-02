import {
  CalendarDotsIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  HouseIcon,
  ImageSquareIcon,
  MegaphoneIcon,
  PackageIcon,
  ScanIcon,
  SwordIcon,
  TableIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { DashNavMenuButton } from "@/client/components/diceshock/DashNavMenu";
import DashQRScannerDialog from "@/client/components/diceshock/DashQRScannerDialog";
import InventoryManagementCard from "@/client/components/diceshock/InventoryManagementCard";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

export const Route = createFileRoute("/dash/")({
  component: RouteComponent,
});

type RecentOrder = {
  id: string;
  status: string;
  start_at: number;
  end_at: number | null;
  nickname: string;
  table: { id: string; name: string; type: string; code: string } | null;
};

function formatTime(val: number | null | undefined): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

function RouteComponent() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    try {
      const result = await trpcClientDash.ordersManagement.list.query({
        search: "",
        status: "all",
        sortBy: "start_at",
        sortOrder: "desc",
        groupBy: "none",
        page: 1,
        pageSize: 8,
      });
      setRecentOrders(result.items);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRecent();
  }, [fetchRecent]);

  const activeOrders = recentOrders.filter((o) => o.status === "active");
  const activeTables = [
    ...new Map(
      activeOrders.filter((o) => o.table).map((o) => [o.table!.id, o.table!]),
    ).values(),
  ];
  const activeUsers = [...new Set(activeOrders.map((o) => o.nickname))];

  return (
    <main className="size-full p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <DashNavMenuButton />
          <button
            type="button"
            className="btn btn-ghost btn-sm gap-1.5"
            onClick={() => setIsScannerOpen(true)}
          >
            <ScanIcon className="size-5" />
            <span className="hidden sm:inline">扫码</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/" className="btn btn-sm btn-ghost gap-1.5">
            <HouseIcon className="size-4 text-primary" />
            主页
          </Link>
          <Link to="/inventory" className="btn btn-sm btn-ghost gap-1.5">
            <PackageIcon className="size-4 text-info" />
            库存查看
          </Link>
          <Link to="/contact-us" className="btn btn-sm btn-ghost gap-1.5">
            <EnvelopeIcon className="size-4 text-success" />
            联系我们
          </Link>
          <Link to="/actives" className="btn btn-sm btn-ghost gap-1.5">
            <CalendarDotsIcon className="size-4 text-error" />
            活动&约局
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/dash/orders"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">订单管理</h3>
                <div className="p-2 bg-info/10 rounded-lg">
                  <ClipboardTextIcon className="size-6 text-info" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                查看和管理使用订单
              </p>
            </div>
          </Link>

          <Link
            to="/dash/users"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">用户管理</h3>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <UsersIcon className="size-6 text-accent" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                查看和管理用户信息
              </p>
            </div>
          </Link>

          <Link
            to="/dash/tables"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">桌台管理</h3>
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <TableIcon className="size-6 text-secondary" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                管理桌台和座位信息
              </p>
            </div>
          </Link>

          <Link
            to="/dash/actives"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">约局管理</h3>
                <div className="p-2 bg-error/10 rounded-lg">
                  <CalendarDotsIcon className="size-6 text-error" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                管理活动和约局信息
              </p>
            </div>
          </Link>

          <Link
            to="/dash/events"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">活动管理</h3>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <MegaphoneIcon className="size-6 text-warning" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                管理活动发布和编辑
              </p>
            </div>
          </Link>

          <Link
            to="/dash/pricing"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">价格计划</h3>
                <div className="p-2 bg-success/10 rounded-lg">
                  <CurrencyDollarIcon className="size-6 text-success" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                管理定价和收费规则
              </p>
            </div>
          </Link>

          <Link
            to="/dash/gsz"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">立直麻将管理</h3>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <SwordIcon className="size-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                查看和管理立直麻将对局
              </p>
            </div>
          </Link>

          <Link
            to="/dash/media"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">媒体库</h3>
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <ImageSquareIcon className="size-6 text-cyan-500" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                上传和管理媒体文件
              </p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <ClipboardTextIcon className="size-5 text-info" />
                  最近订单
                </h3>
                <Link to="/dash/orders" className="btn btn-xs btn-ghost">
                  查看全部
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-dots loading-sm" />
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-6">
                  暂无订单
                </p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.slice(0, 5).map((order) => (
                    <Link
                      key={order.id}
                      to="/dash/orders"
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`badge badge-xs ${
                            order.status === "active"
                              ? "badge-success"
                              : order.status === "paused"
                                ? "badge-neutral"
                                : "badge-ghost"
                          }`}
                        />
                        <span className="text-sm truncate">
                          {order.table?.name ?? "—"}
                        </span>
                      </div>
                      <span className="text-xs text-base-content/50 shrink-0 ml-2">
                        {formatTime(order.start_at)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <TableIcon className="size-5 text-secondary" />
                  活跃桌台
                </h3>
                <Link to="/dash/tables" className="btn btn-xs btn-ghost">
                  查看全部
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-dots loading-sm" />
                </div>
              ) : activeTables.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-6">
                  暂无活跃桌台
                </p>
              ) : (
                <div className="space-y-2">
                  {activeTables.map((table) => (
                    <Link
                      key={table.id}
                      to="/dash/tables/$id"
                      params={{ id: table.id }}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <span className="badge badge-xs badge-success" />
                      <span className="text-sm">{table.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <UsersIcon className="size-5 text-accent" />
                  活跃用户
                </h3>
                <Link to="/dash/users" className="btn btn-xs btn-ghost">
                  查看全部
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-dots loading-sm" />
                </div>
              ) : activeUsers.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-6">
                  暂无活跃用户
                </p>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((name) => (
                    <div
                      key={name}
                      className="flex items-center gap-2 p-2 rounded-lg"
                    >
                      <span className="badge badge-xs badge-accent" />
                      <span className="text-sm truncate">{name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryManagementCard />
        </div>
      </div>

      <DashQRScannerDialog
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
      />
    </main>
  );
}
