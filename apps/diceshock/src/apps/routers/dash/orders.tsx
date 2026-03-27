import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  MagnifyingGlassIcon,
  PauseIcon,
  PlayIcon,
  StopIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import dayjs from "@/shared/utils/dayjs-config";
import {
  calculatePrice,
  formatPrice,
  type SnapshotData,
} from "@/shared/utils/pricing";
import trpcClientPublic, { trpcClientDash } from "@/shared/utils/trpc";

type StatusFilter = "all" | "active" | "paused" | "ended";
type SortBy = "start_at" | "end_at" | "seats";
type SortOrder = "asc" | "desc";
type GroupBy = "table" | "user" | "date" | "none";

type OrdersList = Awaited<
  ReturnType<typeof trpcClientDash.ordersManagement.list.query>
>;
type OrderItem = OrdersList["items"][number];

export const Route = createFileRoute("/dash/orders")({
  component: RouteComponent,
});

function formatTime(val: number | null | undefined): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm:ss") : "—";
  } catch {
    return "—";
  }
}

function RouteComponent() {
  const msg = useMsg();
  const navigate = useNavigate();
  const [data, setData] = useState<OrdersList | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingSnapshot, setPricingSnapshot] = useState<SnapshotData | null>(
    null,
  );
  const [, setTick] = useState(0);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("start_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const searchRef = useRef(searchText);
  useEffect(() => {
    searchRef.current = searchText;
  }, [searchText]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [result, published] = await Promise.all([
        trpcClientDash.ordersManagement.list.query({
          search: searchRef.current,
          status: statusFilter,
          sortBy,
          sortOrder,
          groupBy,
          page,
          pageSize,
        }),
        trpcClientPublic.pricing.getPublished.query(),
      ]);
      setData(result);
      setPricingSnapshot(published?.data ?? null);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取订单列表失败");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sortBy, sortOrder, groupBy, page, msg]);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = () => {
    setPage(1);
    void fetchOrders();
  };

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success("已复制");
    } catch {
      msg.error("没有剪贴板访问权限");
    }
  };

  const [actionPending, setActionPending] = useState<string | null>(null);

  const handleEndOrder = async (id: string, status: string) => {
    setActionPending(id);
    try {
      if (status === "active") {
        await trpcClientDash.ordersManagement.pauseOrder.mutate({ id });
      }
      void navigate({ to: "/dash/orders/$id/settle", params: { id } });
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setActionPending(null);
    }
  };

  const handlePauseOrder = async (id: string) => {
    setActionPending(id);
    try {
      await trpcClientDash.ordersManagement.pauseOrder.mutate({ id });
      msg.success("已暂停");
      await fetchOrders();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "暂停失败");
    } finally {
      setActionPending(null);
    }
  };

  const handleResumeOrder = async (id: string) => {
    setActionPending(id);
    try {
      await trpcClientDash.ordersManagement.resumeOrder.mutate({ id });
      msg.success("已继续");
      await fetchOrders();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "继续失败");
    } finally {
      setActionPending(null);
    }
  };

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const groupedItems = useMemo(() => {
    if (groupBy === "none") return [{ key: "", items }];

    const groups = new Map<string, OrderItem[]>();
    for (const item of items) {
      let key: string;
      switch (groupBy) {
        case "table":
          key = item.table?.name ?? "未知桌台";
          break;
        case "user":
          key = item.nickname;
          break;
        case "date":
          key = item.start_at
            ? dayjs.tz(item.start_at, "Asia/Shanghai").format("YYYY/MM/DD")
            : "未知日期";
          break;
        default:
          key = "";
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return Array.from(groups.entries()).map(([key, items]) => ({ key, items }));
  }, [items, groupBy]);

  const groupLabel = (key: string): string => {
    switch (groupBy) {
      case "table":
        return `桌台: ${key}`;
      case "user":
        return `用户: ${key}`;
      case "date":
        return `日期: ${key}`;
      default:
        return key;
    }
  };

  return (
    <main className="size-full flex flex-col">
      <div className="px-4 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <DashBackButton />
          <label className="input input-bordered input-sm flex items-center gap-2 flex-1 min-w-0">
            <MagnifyingGlassIcon className="size-4 opacity-50 shrink-0" />
            <input
              type="text"
              className="grow min-w-0"
              placeholder="搜索订单号/桌台/用户..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </label>
        </div>

        <div className="flex items-center gap-1">
          {(
            [
              ["all", "全部"],
              ["active", "进行中"],
              ["paused", "已暂停"],
              ["ended", "已结束"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${statusFilter === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setStatusFilter(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <select
              className="select select-bordered select-xs"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortBy);
                setPage(1);
              }}
            >
              <option value="start_at">开始时间</option>
              <option value="end_at">结束时间</option>
              <option value="seats">人数</option>
            </select>

            <button
              type="button"
              className="btn btn-xs btn-ghost btn-square"
              onClick={toggleSortOrder}
              title={sortOrder === "asc" ? "升序" : "降序"}
            >
              {sortOrder === "asc" ? (
                <ArrowUpIcon className="size-4" />
              ) : (
                <ArrowDownIcon className="size-4" />
              )}
            </button>

            <select
              className="select select-bordered select-xs"
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as GroupBy);
                setPage(1);
              }}
            >
              <option value="none">无分组</option>
              <option value="table">按桌台</option>
              <option value="user">按用户</option>
              <option value="date">按日期</option>
            </select>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1200px]">
          <thead>
            <tr className="z-20">
              <td className="whitespace-nowrap">订单号</td>
              <td className="whitespace-nowrap">状态</td>
              <td className="whitespace-nowrap">开始时间</td>
              <td className="whitespace-nowrap">结束时间</td>
              <td className="whitespace-nowrap">桌台</td>
              <td className="whitespace-nowrap">用户</td>
              <td className="whitespace-nowrap">人数</td>
              <td className="whitespace-nowrap">费用</td>
              <th className="whitespace-nowrap">操作</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="py-12 text-center text-base-content/60"
                >
                  {searchText.trim() || statusFilter !== "all"
                    ? "没有匹配的订单。"
                    : "暂无订单数据。"}
                </td>
              </tr>
            ) : (
              groupedItems.map((group) => (
                <>
                  {group.key && (
                    <tr key={`group-${group.key}`}>
                      <td
                        colSpan={9}
                        className="bg-base-200 font-semibold text-sm py-2"
                      >
                        {groupLabel(group.key)}
                      </td>
                    </tr>
                  )}
                  {group.items.map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono">
                        <div className="relative group flex items-center gap-1">
                          <span className="cursor-default">
                            {order.id.slice(0, 5)}
                          </span>
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-square shrink-0"
                            onClick={() => handleCopy(order.id)}
                            title="复制订单号"
                          >
                            <CopyIcon className="size-3.5" />
                          </button>
                          <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
                            <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
                              {order.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {order.status === "active" ? (
                          <span className="badge badge-success badge-sm">
                            进行中
                          </span>
                        ) : order.status === "paused" ? (
                          <span className="badge badge-neutral badge-sm">
                            已暂停
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm">
                            已结束
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap">
                        {formatTime(order.start_at)}
                      </td>
                      <td className="whitespace-nowrap">
                        {formatTime(order.end_at)}
                      </td>
                      <td className="whitespace-nowrap">
                        {order.table ? (
                          <Link
                            to="/dash/tables/$id"
                            params={{ id: order.table_id }}
                            className="link link-hover"
                          >
                            {order.table.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <Link
                          to="/dash/users/$id"
                          params={{ id: order.user_id ?? "" }}
                          className="link link-hover"
                        >
                          {order.nickname}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap">{order.seats}</td>
                      <td className="font-mono whitespace-nowrap">
                        {order.final_price != null
                          ? formatPrice(order.final_price)
                          : order.status !== "ended" && pricingSnapshot
                            ? (() => {
                                const p = calculatePrice(
                                  order.start_at,
                                  Date.now(),
                                  order.table?.type ?? "boardgame",
                                  pricingSnapshot,
                                );
                                return p ? (
                                  <span className="text-base-content/50">
                                    ~{formatPrice(p.finalPrice)}
                                  </span>
                                ) : (
                                  "—"
                                );
                              })()
                            : "—"}
                      </td>
                      <th className="whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {order.status === "active" && (
                            <>
                              <button
                                type="button"
                                className={clsx(
                                  "btn btn-xs btn-ghost",
                                  actionPending === order.id && "btn-disabled",
                                )}
                                onClick={() => void handlePauseOrder(order.id)}
                                disabled={actionPending === order.id}
                              >
                                <PauseIcon className="size-3" />
                                暂停
                              </button>
                              <button
                                type="button"
                                className={clsx(
                                  "btn btn-xs btn-ghost btn-error",
                                  actionPending === order.id && "btn-disabled",
                                )}
                                onClick={() => void handleEndOrder(order.id)}
                                disabled={actionPending === order.id}
                              >
                                <StopIcon className="size-3" />
                                终止
                              </button>
                            </>
                          )}
                          {order.status === "paused" && (
                            <>
                              <button
                                type="button"
                                className={clsx(
                                  "btn btn-xs btn-ghost btn-success",
                                  actionPending === order.id && "btn-disabled",
                                )}
                                onClick={() => void handleResumeOrder(order.id)}
                                disabled={actionPending === order.id}
                              >
                                <PlayIcon className="size-3" />
                                继续
                              </button>
                              <button
                                type="button"
                                className={clsx(
                                  "btn btn-xs btn-ghost btn-error",
                                  actionPending === order.id && "btn-disabled",
                                )}
                                onClick={() => void handleEndOrder(order.id)}
                                disabled={actionPending === order.id}
                              >
                                <StopIcon className="size-3" />
                                终止
                              </button>
                            </>
                          )}
                        </div>
                      </th>
                    </tr>
                  ))}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > pageSize && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-base-300 rounded-box px-6 py-3 shadow-xl">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            上一页
          </button>
          <span className="text-sm font-medium">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </main>
  );
}
