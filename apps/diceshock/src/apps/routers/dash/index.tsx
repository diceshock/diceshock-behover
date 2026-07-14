import { useApolloClient } from "@apollo/client";
import {
  CalendarDotsIcon,
  ClipboardTextIcon,
  CurrencyDollarIcon,
  DotsThreeVerticalIcon,
  EnvelopeIcon,
  EyeIcon,
  HouseIcon,
  ImageSquareIcon,
  MegaphoneIcon,
  PackageIcon,
  ShieldCheckIcon,
  SwordIcon,
  TableIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import InventoryManagementCard from "@/client/components/diceshock/InventoryManagementCard";
import {
  CaptchaSettingsDocument,
  OrderStatus,
  OrdersDocument,
  type OrdersQuery,
  SetCaptchaEnabledDocument,
} from "@/client/graphql/__generated__";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";
import { formatDualPrice, formatPrice, formatPoints } from "@/shared/utils/pricing";

export const Route = createFileRoute("/dash/")({
  component: RouteComponent,
});

type RecentOrder = OrdersQuery["orders"]["items"][number];

function formatTime(val: string | null | undefined): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  if (phone.length <= 4) return phone;
  const start = phone.slice(0, 3);
  const end = phone.slice(-2);
  return `${start}***${end}`;
}

function RouteComponent() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [captchaEnabled, setCaptchaEnabled] = useState(true);
  const [captchaDisabledUntil, setCaptchaDisabledUntil] = useState<
    number | null
  >(null);
  const [captchaToggling, setCaptchaToggling] = useState(false);

  useEffect(() => {
    client
      .query({ query: CaptchaSettingsDocument })
      .then((res) => {
        setCaptchaEnabled(res.data.captchaSettings.enabled);
        setCaptchaDisabledUntil(
          res.data.captchaSettings.disabledUntil
            ? Number(res.data.captchaSettings.disabledUntil)
            : null,
        );
      })
      .catch(() => {});
  }, [client]);

  const handleCaptchaToggle = useCallback(
    async (enabled: boolean) => {
      setCaptchaToggling(true);
      try {
        const res = await client.mutate({
          mutation: SetCaptchaEnabledDocument,
          variables: { enabled },
        });
        if (res.data?.setCaptchaEnabled) {
          const data = res.data.setCaptchaEnabled;
          setCaptchaEnabled(data.enabled);
          setCaptchaDisabledUntil(
            data.disabledUntil
              ? Number(new Date(data.disabledUntil).getTime())
              : null,
          );
        }
      } catch {
      } finally {
        setCaptchaToggling(false);
      }
    },
    [client],
  );

  const fetchRecent = useCallback(async () => {
    try {
      const result = await client.query({
        query: OrdersDocument,
        variables: {
          input: {
            search: "",
            status: "ALL",
            pagination: { offset: 0, limit: 8 },
          },
        },
      });
      if (result.data?.orders?.items) {
        setRecentOrders(result.data.orders.items);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchRecent();
  }, [fetchRecent]);

  const activeOrders = recentOrders.filter(
    (o) => o.status === OrderStatus.Active,
  );
  const activeTables = useMemo(() => {
    const map = new Map<string, { id: string; name: string; orderIds: string[]; orderCount: number }>();
    for (const o of activeOrders) {
      if (!o.table) continue;
      const existing = map.get(o.table.id);
      if (existing) {
        existing.orderIds.push(o.id);
        existing.orderCount++;
      } else {
        map.set(o.table.id, { id: o.table.id, name: o.table.name, orderIds: [o.id], orderCount: 1 });
      }
    }
    return [...map.values()];
  }, [activeOrders]);
  const activeUsers = useMemo(() => {
    const map = new Map<string, { key: string; name: string; userId: string | null; phone: string | null; orderIds: string[] }>();
    for (const o of activeOrders) {
      const key = o.userId ?? o.tempId ?? o.nickname ?? o.id;
      const existing = map.get(key);
      if (existing) {
        existing.orderIds.push(o.id);
        if (!existing.phone && o.phone) existing.phone = o.phone;
      } else {
        map.set(key, { key, name: o.nickname ?? o.uid ?? "—", userId: o.userId, phone: o.phone ?? null, orderIds: [o.id] });
      }
    }
    return [...map.values()];
  }, [activeOrders]);

  return (
    <main className="size-full p-4 overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent Orders */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <ClipboardTextIcon className="size-5 text-info" />
                  {t("dashIndex.recentOrders")}
                </h3>
                <Link
                  to="/dash/orders"
                  search={{
                    q: "",
                    sortBy: "start_at",
                    sortOrder: "desc",
                    groupBy: "none",
                    page: 1,
                  }}
                  className="btn btn-xs btn-ghost"
                >
                  {t("dashIndex.viewAll")}
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-dots loading-sm" />
                </div>
              ) : recentOrders.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-6">
                  {t("dashIndex.noOrders")}
                </p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge badge-xs ${
                              order.status === OrderStatus.Active
                                ? "badge-success"
                                : order.status === OrderStatus.Paused
                                  ? "badge-neutral"
                                  : order.status === OrderStatus.Settled
                                    ? "badge-info"
                                    : "badge-ghost"
                            }`}
                          />
                          <span className="text-sm truncate">
                            {order.table?.name ?? "—"}
                          </span>
                          <span className="text-xs text-base-content/50">
                            {order.nickname ?? ""}
                          </span>
                        </div>
                        <div className="text-xs text-base-content/60 ml-4">
                          {order.status === OrderStatus.Settled ? (
                            <span className="text-success">
                              {order.settledPrice != null && order.settledPrice > 0
                                ? `${formatPrice(order.settledPrice)} 储值`
                                : order.settledPoints != null && order.settledPoints > 0
                                  ? `${formatPoints(order.settledPoints)} 积分`
                                  : `${formatDualPrice(order.finalPrice, order.finalPoints)} 外部`}
                            </span>
                          ) : (
                            <span className="text-warning">
                              {formatDualPrice(order.finalPrice, order.finalPoints)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <span className="text-xs text-base-content/50">
                          {formatTime(order.startAt)}
                        </span>
                        <div className="dropdown dropdown-end">
                          <div
                            tabIndex={0}
                            role="button"
                            className="btn btn-xs btn-ghost btn-square"
                          >
                            <DotsThreeVerticalIcon className="size-4" weight="bold" />
                          </div>
                          <ul
                            tabIndex={0}
                            className="dropdown-content menu bg-base-200 rounded-box z-50 w-28 p-2 shadow-lg"
                          >
                            <li>
                              <Link
                                to="/dash/orders/settle"
                                search={{ ids: [order.id] }}
                              >
                                <EyeIcon className="size-4" />
                                {t("dashIndex.detail")}
                              </Link>
                            </li>
                            {(order.status === OrderStatus.Active || order.status === OrderStatus.Paused) && (
                              <li>
                                <Link
                                  to="/dash/orders/settle"
                                  search={{ ids: [order.id] }}
                                >
                                  <CurrencyDollarIcon className="size-4" />
                                  {t("dashIndex.settle")}
                                </Link>
                              </li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Tables */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <TableIcon className="size-5 text-secondary" />
                  {t("dashIndex.activeTables")}
                </h3>
                <Link
                  to="/dash/tables"
                  search={{ q: "", page: 1 }}
                  className="btn btn-xs btn-ghost"
                >
                  {t("dashIndex.viewAll")}
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-dots loading-sm" />
                </div>
              ) : activeTables.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-6">
                  {t("dashIndex.noActiveTables")}
                </p>
              ) : (
                <div className="space-y-2">
                  {activeTables.map((table) => (
                    <div
                      key={table.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-xs badge-success" />
                          <span className="text-sm">{table.name}</span>
                          <span className="text-xs text-base-content/40 font-mono">#{table.id.slice(0, 6)}</span>
                        </div>
                        <span className="text-xs text-base-content/60 ml-4">
                          {table.orderCount} {t("dashIndex.orderCount")}
                        </span>
                      </div>
                      <div className="dropdown dropdown-end">
                        <div
                          tabIndex={0}
                          role="button"
                          className="btn btn-xs btn-ghost btn-square"
                        >
                          <DotsThreeVerticalIcon className="size-4" weight="bold" />
                        </div>
                        <ul
                          tabIndex={0}
                          className="dropdown-content menu bg-base-200 rounded-box z-50 w-32 p-2 shadow-lg"
                        >
                          <li>
                            <Link
                              to="/dash/tables/$id"
                              params={{ id: table.id }}
                              search={{ tab: "basic" }}
                            >
                              <EyeIcon className="size-4" />
                              {t("dashIndex.detail")}
                            </Link>
                          </li>
                          <li>
                            <Link
                              to="/dash/orders/settle"
                              search={{ ids: table.orderIds }}
                            >
                              <CurrencyDollarIcon className="size-4" />
                              {t("dashIndex.settleAll")}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Users */}
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold flex items-center gap-2">
                  <UsersIcon className="size-5 text-accent" />
                  {t("dashIndex.activeUsers")}
                </h3>
                <Link
                  to="/dash/users"
                  search={{ q: "", page: 1 }}
                  className="btn btn-xs btn-ghost"
                >
                  {t("dashIndex.viewAll")}
                </Link>
              </div>
              {loading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-dots loading-sm" />
                </div>
              ) : activeUsers.length === 0 ? (
                <p className="text-sm text-base-content/50 text-center py-6">
                  {t("dashIndex.noActiveUsers")}
                </p>
              ) : (
                <div className="space-y-2">
                  {activeUsers.map((user) => (
                    <div
                      key={user.key}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-base-200 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="badge badge-xs badge-accent" />
                          <span className="text-sm truncate">{user.name}</span>
                        </div>
                        {user.phone && (
                          <span className="text-xs text-base-content/50 ml-4 font-mono">
                            {maskPhone(user.phone)}
                          </span>
                        )}
                      </div>
                      <div className="dropdown dropdown-end">
                        <div
                          tabIndex={0}
                          role="button"
                          className="btn btn-xs btn-ghost btn-square"
                        >
                          <DotsThreeVerticalIcon className="size-4" weight="bold" />
                        </div>
                        <ul
                          tabIndex={0}
                          className="dropdown-content menu bg-base-200 rounded-box z-50 w-28 p-2 shadow-lg"
                        >
                          {user.userId && (
                            <li>
                              <Link
                                to="/dash/users/$id"
                                params={{ id: user.userId }}
                                search={{ tab: "basic" }}
                              >
                                <EyeIcon className="size-4" />
                                {t("dashIndex.detail")}
                              </Link>
                            </li>
                          )}
                          <li>
                            <Link
                              to="/dash/orders/settle"
                              search={{ ids: user.orderIds }}
                            >
                              <CurrencyDollarIcon className="size-4" />
                              {t("dashIndex.settle")}
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/dash/orders"
            search={{
              q: "",
              sortBy: "start_at",
              sortOrder: "desc",
              groupBy: "none",
              page: 1,
            }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.orderManagement")}</h3>
                <div className="p-2 bg-info/10 rounded-lg">
                  <ClipboardTextIcon className="size-6 text-info" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.orderManagementDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/users"
            search={{ q: "", page: 1 }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.userManagement")}</h3>
                <div className="p-2 bg-accent/10 rounded-lg">
                  <UsersIcon className="size-6 text-accent" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.userManagementDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/tables"
            search={{ q: "", page: 1 }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.tableManagement")}</h3>
                <div className="p-2 bg-secondary/10 rounded-lg">
                  <TableIcon className="size-6 text-secondary" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.tableManagementDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/actives"
            search={{ q: "" }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.meetupManagement")}</h3>
                <div className="p-2 bg-error/10 rounded-lg">
                  <CalendarDotsIcon className="size-6 text-error" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.meetupManagementDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/events"
            search={{ q: "", page: 1 }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.eventManagement")}</h3>
                <div className="p-2 bg-warning/10 rounded-lg">
                  <MegaphoneIcon className="size-6 text-warning" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.eventManagementDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/pricing"
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.pricingPlans")}</h3>
                <div className="p-2 bg-success/10 rounded-lg">
                  <CurrencyDollarIcon className="size-6 text-success" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.pricingPlansDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/gsz"
            search={{ q: "", page: 1 }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.riichiManagement")}</h3>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <SwordIcon className="size-6 text-primary" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.riichiManagementDesc")}
              </p>
            </div>
          </Link>

          <Link
            to="/dash/media"
            search={{ q: "", type: "", sort: "uploaded-desc" }}
            className="card bg-base-100 shadow-sm hover:bg-base-200/50 transition-colors"
          >
            <div className="card-body p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">{t("dashIndex.mediaLibrary")}</h3>
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <ImageSquareIcon className="size-6 text-cyan-500" />
                </div>
              </div>
              <p className="text-sm text-base-content/60 mt-1">
                {t("dashIndex.mediaLibraryDesc")}
              </p>
            </div>
          </Link>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-4 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-warning" />
              {t("dashIndex.systemSettings")}
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("dashIndex.turnstileCheck")}
                </p>
                <p className="text-xs text-base-content/60">
                  {captchaEnabled
                    ? t("dashIndex.turnstileEnabledDesc")
                    : t("dashIndex.turnstileDisabledDesc")}
                </p>
                {!captchaEnabled && captchaDisabledUntil && (
                  <CaptchaCountdown until={captchaDisabledUntil} />
                )}
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={captchaEnabled}
                disabled={captchaToggling}
                onChange={(e) => handleCaptchaToggle(e.target.checked)}
              />
            </div>
            <div className="divider my-0" />
            <InventoryManagementCard />
          </div>
        </div>

        <footer className="border-t border-base-300 pt-4 pb-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <a
              href="https://diceshock.com/"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <HouseIcon className="size-3.5" />
              {t("dashIndex.home")}
            </a>
            <span className="text-base-content/30">·</span>
            <a
              href="https://diceshock.com/inventory"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <PackageIcon className="size-3.5" />
              {t("dashIndex.inventoryView")}
            </a>
            <span className="text-base-content/30">·</span>
            <a
              href="https://diceshock.com/contact-us"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <EnvelopeIcon className="size-3.5" />
              {t("dashIndex.contactUs")}
            </a>
            <span className="text-base-content/30">·</span>
            <a
              href="https://diceshock.com/actives"
              className="link link-hover text-xs text-base-content/60 inline-flex items-center gap-1"
            >
              <CalendarDotsIcon className="size-3.5" />
              {t("dashIndex.activitiesMeetups")}
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function CaptchaCountdown({ until }: { until: number }) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((until - Date.now()) / 1000)),
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.floor((until - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  if (remaining <= 0) return null;

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <p className="text-xs text-warning mt-1">
      {formatMessage(t("dashIndex.autoRestoreAfter"), {
        time: h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`,
      })}
    </p>
  );
}
