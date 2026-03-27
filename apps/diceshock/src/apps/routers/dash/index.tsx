import {
  CalendarDotsIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  HouseIcon,
  MegaphoneIcon,
  PackageIcon,
  RobotIcon,
  TableIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { DashNavMenuButton } from "@/client/components/diceshock/DashNavMenu";
import InventoryManagementCard from "@/client/components/diceshock/InventoryManagementCard";

export const Route = createFileRoute("/dash/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className="size-full p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <DashNavMenuButton />
        <div className="bg-base-100 shadow-sm rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">快速导航</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link
              to="/"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <HouseIcon className="size-6 text-primary" />
              <span className="text-sm">主页</span>
            </Link>
            <Link
              to="/me"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <UserIcon className="size-6 text-accent" />
              <span className="text-sm">个人中心</span>
            </Link>
            <Link
              to="/inventory"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <PackageIcon className="size-6 text-info" />
              <span className="text-sm">库存查看</span>
            </Link>
            <Link
              to="/diceshock-agents"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <RobotIcon className="size-6 text-warning" />
              <span className="text-sm">DiceShock Agents©</span>
            </Link>
            <Link
              to="/contact-us"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <EnvelopeIcon className="size-6 text-success" />
              <span className="text-sm">联系我们</span>
            </Link>
            <Link
              to="/actives"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors"
            >
              <CalendarDotsIcon className="size-6 text-error" />
              <span className="text-sm">活动&约局</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <Link
            to="/dash/actives"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-error/10 rounded-lg">
                  <CalendarDotsIcon className="size-8 text-error" />
                </div>
                <div>
                  <h3 className="card-title text-lg">约局管理</h3>
                  <p className="text-sm text-base-content/60">
                    管理活动和约局信息
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/dash/events"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-warning/10 rounded-lg">
                  <MegaphoneIcon className="size-8 text-warning" />
                </div>
                <div>
                  <h3 className="card-title text-lg">活动管理</h3>
                  <p className="text-sm text-base-content/60">
                    管理活动发布和编辑
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/dash/tables"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <TableIcon className="size-8 text-secondary" />
                </div>
                <div>
                  <h3 className="card-title text-lg">桌台管理</h3>
                  <p className="text-sm text-base-content/60">
                    管理桌台和座位信息
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/dash/pricing"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <CurrencyDollarIcon className="size-8 text-success" />
                </div>
                <div>
                  <h3 className="card-title text-lg">价格计划</h3>
                  <p className="text-sm text-base-content/60">
                    管理定价和收费规则
                  </p>
                </div>
              </div>
            </div>
          </Link>

          <Link
            to="/dash/orders"
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="card-body">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-info/10 rounded-lg">
                  <ClipboardTextIcon className="size-8 text-info" />
                </div>
                <div>
                  <h3 className="card-title text-lg">订单管理</h3>
                  <p className="text-sm text-base-content/60">
                    查看和管理使用订单
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <InventoryManagementCard />
        </div>
      </div>
    </main>
  );
}
