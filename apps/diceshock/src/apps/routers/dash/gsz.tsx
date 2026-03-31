import {
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  StopIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import type { Wind } from "@/shared/mahjong/constants";
import { WIND_LABELS } from "@/shared/mahjong/constants";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

type ModeFilter = "all" | "3p" | "4p";
type FormatFilter = "all" | "tonpuu" | "hanchan";
type CompletionFilter = "all" | "completed" | "incomplete";

type MatchList = Awaited<
  ReturnType<typeof trpcClientDash.gszManagement.list.query>
>;

type TableOption = Awaited<
  ReturnType<typeof trpcClientDash.gszManagement.listTables.query>
>[number];

type ActiveMatch = Awaited<
  ReturnType<typeof trpcClientDash.gszManagement.listActive.query>
>[number];

const MODE_LABELS: Record<string, string> = {
  "3p": "三麻",
  "4p": "四麻",
};

const FORMAT_LABELS: Record<string, string> = {
  tonpuu: "东风场",
  hanchan: "半庄",
};

const TERMINATION_LABELS: Record<string, string> = {
  format_complete: "场制完成",
  bust: "飞人终局",
  vote: "投票结算",
  admin_abort: "管理员终止",
  order_invalid: "订单失效",
};

const PHASE_LABELS: Record<string, string> = {
  seat_select: "选座中",
  countdown: "倒计时",
  playing: "对局中",
  scoring: "录入点数",
  round_review: "本局总览",
  voting: "投票结算中",
};

const INCOMPLETE_REASONS = new Set(["admin_abort", "order_invalid"]);

export const Route = createFileRoute("/dash/gsz")({
  component: RouteComponent,
});

function formatTime(val: number | null | undefined): string {
  if (!val) return "—";
  try {
    const d = dayjs.tz(val, "Asia/Shanghai");
    return d.isValid() ? d.format("YYYY/MM/DD HH:mm") : "—";
  } catch {
    return "—";
  }
}

function RouteComponent() {
  const msg = useMsg();
  const isMobile = useIsMobile();
  const [data, setData] = useState<MatchList | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableOptions, setTableOptions] = useState<TableOption[]>([]);

  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all");
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [completionFilter, setCompletionFilter] =
    useState<CompletionFilter>("all");
  const [tableFilter, setTableFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const searchRef = useRef(searchText);
  useEffect(() => {
    searchRef.current = searchText;
  }, [searchText]);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const result = await trpcClientDash.gszManagement.list.query({
        search: searchRef.current,
        mode: modeFilter,
        format: formatFilter,
        completion: completionFilter,
        tableId: tableFilter,
        startDate: startDate
          ? dayjs.tz(startDate, "Asia/Shanghai").startOf("day").valueOf()
          : null,
        endDate: endDate
          ? dayjs.tz(endDate, "Asia/Shanghai").endOf("day").valueOf()
          : null,
        page,
        pageSize,
      });
      setData(result);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "获取对局列表失败");
    } finally {
      setLoading(false);
    }
  }, [
    modeFilter,
    formatFilter,
    completionFilter,
    tableFilter,
    startDate,
    endDate,
    page,
    msg,
  ]);

  const fetchActive = useCallback(async () => {
    setActiveLoading(true);
    try {
      const result = await trpcClientDash.gszManagement.listActive.query();
      setActiveMatches(result);
    } catch {
      // noop
    } finally {
      setActiveLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    void fetchActive();
    const interval = setInterval(() => void fetchActive(), 10000);
    return () => clearInterval(interval);
  }, [fetchActive]);

  useEffect(() => {
    trpcClientDash.gszManagement.listTables
      .query()
      .then(setTableOptions)
      .catch(() => {});
  }, []);

  const handleSearch = () => {
    setPage(1);
    void fetchMatches();
  };

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success("已复制");
    } catch {
      msg.error("没有剪贴板访问权限");
    }
  };

  const handleTerminate = async (tableCode: string) => {
    try {
      await trpcClientDash.gszManagement.terminateMatch.mutate({
        tableCode,
        reason: "admin_abort",
      });
      msg.success("已终止");
      void fetchActive();
      void fetchMatches();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "终止失败");
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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
              placeholder="搜索ID/玩家昵称/玩家ID/桌台..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ["all", "全部"],
              ["3p", "三麻"],
              ["4p", "四麻"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${modeFilter === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setModeFilter(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}

          <span className="text-base-content/30 mx-1">|</span>

          {(
            [
              ["all", "全部"],
              ["hanchan", "半庄"],
              ["tonpuu", "东风"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${formatFilter === key ? "btn-secondary" : "btn-ghost"}`}
              onClick={() => {
                setFormatFilter(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}

          <span className="text-base-content/30 mx-1">|</span>

          {(
            [
              ["all", "全部"],
              ["completed", "已完成"],
              ["incomplete", "未完成"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${completionFilter === key ? "btn-accent" : "btn-ghost"}`}
              onClick={() => {
                setCompletionFilter(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {tableOptions.length > 0 && (
              <select
                className="select select-bordered select-xs"
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">全部桌台</option>
                {tableOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <input
              type="date"
              className="input input-bordered input-xs"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              title="开始日期"
            />
            <span className="text-xs text-base-content/50">~</span>
            <input
              type="date"
              className="input input-bordered input-xs"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              title="结束日期"
            />
          </div>
        </div>
      </div>

      {!activeLoading && activeMatches.length > 0 && (
        <ActiveMatchesSection
          matches={activeMatches}
          onTerminate={handleTerminate}
        />
      )}

      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1100px]">
          <thead>
            <tr className="z-20">
              <td className="whitespace-nowrap">ID</td>
              <td className="whitespace-nowrap">桌台</td>
              <td className="whitespace-nowrap">模式</td>
              <td className="whitespace-nowrap">场制</td>
              <td className="whitespace-nowrap">开始时间</td>
              <td className="whitespace-nowrap">结束时间</td>
              <td className="whitespace-nowrap">玩家</td>
              <td className="whitespace-nowrap">终止原因</td>
              <th className="whitespace-nowrap">操作</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="py-12 text-center text-base-content/60"
                >
                  {searchText.trim() ||
                  modeFilter !== "all" ||
                  formatFilter !== "all" ||
                  completionFilter !== "all" ||
                  tableFilter ||
                  startDate ||
                  endDate
                    ? "没有匹配的对局记录。"
                    : "暂无公式战数据。"}
                </td>
              </tr>
            ) : (
              items.map((match) => (
                <tr
                  key={match.id}
                  className={
                    INCOMPLETE_REASONS.has(match.termination_reason)
                      ? "opacity-60"
                      : ""
                  }
                >
                  <td className="font-mono">
                    <div className="relative group flex items-center gap-1">
                      <span className="cursor-default">
                        {match.id.slice(0, 5)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-square shrink-0"
                        onClick={() => handleCopy(match.id)}
                        title="复制ID"
                      >
                        <CopyIcon className="size-3.5" />
                      </button>
                      <div className="absolute right-0 top-full z-30 hidden group-hover:block pt-1">
                        <div className="bg-base-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-mono whitespace-nowrap">
                          {match.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {match.table?.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      className={`badge badge-sm ${match.mode === "4p" ? "badge-primary" : "badge-secondary"}`}
                    >
                      {MODE_LABELS[match.mode] ?? match.mode}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="badge badge-sm badge-outline">
                      {FORMAT_LABELS[match.format] ?? match.format}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatTime(match.started_at)}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatTime(match.ended_at)}
                  </td>
                  <td
                    className="max-w-[200px] truncate"
                    title={match.player_names}
                  >
                    {match.player_names || "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      className={clsx(
                        "badge badge-sm",
                        INCOMPLETE_REASONS.has(match.termination_reason)
                          ? "badge-warning"
                          : "badge-ghost",
                      )}
                    >
                      {TERMINATION_LABELS[match.termination_reason] ??
                        match.termination_reason}
                    </span>
                  </td>
                  <th className="whitespace-nowrap">
                    {isMobile ? (
                      <div className="dropdown dropdown-end">
                        <div
                          tabIndex={0}
                          role="button"
                          className="btn btn-xs btn-ghost btn-square"
                        >
                          <DotsThreeVerticalIcon
                            className="size-4"
                            weight="bold"
                          />
                        </div>
                        <ul
                          tabIndex={0}
                          className="dropdown-content menu bg-base-200 rounded-box z-50 w-32 p-2 shadow-lg"
                        >
                          <li>
                            <Link to="/dash/gsz/$id" params={{ id: match.id }}>
                              <EyeIcon className="size-4" />
                              详情
                            </Link>
                          </li>
                        </ul>
                      </div>
                    ) : (
                      <Link
                        to="/dash/gsz/$id"
                        params={{ id: match.id }}
                        className="btn btn-xs btn-ghost"
                      >
                        <EyeIcon className="size-4" />
                        详情
                      </Link>
                    )}
                  </th>
                </tr>
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

function ActiveMatchesSection({
  matches,
  onTerminate,
}: {
  matches: ActiveMatch[];
  onTerminate: (tableCode: string) => void;
}) {
  const [terminating, setTerminating] = useState<string | null>(null);

  const handleTerminate = async (tableCode: string) => {
    setTerminating(tableCode);
    try {
      onTerminate(tableCode);
    } finally {
      setTerminating(null);
    }
  };

  return (
    <div className="px-4 py-3">
      <div className="text-sm font-semibold mb-2 flex items-center gap-2">
        <span className="relative flex size-2">
          <span className="animate-ping absolute inline-flex size-full rounded-full bg-success opacity-75" />
          <span className="relative inline-flex rounded-full size-2 bg-success" />
        </span>
        进行中 ({matches.length})
      </div>
      <div className="flex flex-col gap-2">
        {matches.map((m) => (
          <div
            key={m.tableCode}
            className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{m.tableName}</span>
                <span
                  className={`badge badge-xs ${m.mode === "4p" ? "badge-primary" : "badge-secondary"}`}
                >
                  {MODE_LABELS[m.mode] ?? m.mode}
                </span>
                <span className="badge badge-xs badge-outline">
                  {FORMAT_LABELS[m.format] ?? m.format}
                </span>
                <span className="badge badge-xs badge-info">
                  {PHASE_LABELS[m.phase] ?? m.phase}
                </span>
                {m.phase === "playing" && (
                  <span className="text-xs text-base-content/50">
                    {WIND_LABELS[m.currentWind as Wind] ?? m.currentWind}
                    {m.currentRoundNumber}局
                    {m.roundCount > 0 && ` · 已完成${m.roundCount}局`}
                  </span>
                )}
              </div>
              <div className="text-xs text-base-content/50 mt-1 truncate">
                {m.players.map((p) => p.nickname).join(", ")}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-xs btn-error btn-outline shrink-0"
              disabled={terminating === m.tableCode}
              onClick={() => handleTerminate(m.tableCode)}
            >
              {terminating === m.tableCode ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <StopIcon className="size-3.5" />
              )}
              终止
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
