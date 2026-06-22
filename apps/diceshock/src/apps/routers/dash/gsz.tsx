import { useApolloClient } from "@apollo/client";
import {
  ArrowsClockwiseIcon,
  CopyIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  StopIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import type {
  ActiveMahjongMatchesQuery,
  MahjongTablesQuery,
  ManagedMahjongMatchesQuery,
} from "@/client/graphql/__generated__";
import {
  ActiveMahjongMatchesDocument,
  BatchSyncMahjongMatchesToGszDocument,
  MahjongMatchType,
  MahjongMode,
  MahjongTablesDocument,
  ManagedMahjongMatchesDocument,
  SyncMahjongMatchToGszDocument,
  TerminateMahjongMatchDocument,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";

type ModeFilter = "all" | "THREE_PLAYER" | "FOUR_PLAYER";
type FormatFilter = "all" | "TONPUU" | "HANCHAN";
type CompletionFilter = "all" | "completed" | "incomplete";
type GszSyncFilter = "all" | "synced" | "unsynced";
type Translator = ReturnType<typeof useTranslation>["t"];

type MatchList = ManagedMahjongMatchesQuery["managedMahjongMatches"];
type TableOption = NonNullable<MahjongTablesQuery["mahjongTables"]>[number];
type ActiveMatch = NonNullable<
  ActiveMahjongMatchesQuery["activeMahjongMatches"]
>[number];

const MODE_LABEL_KEYS: Record<string, string> = {
  "3p": "dashGsz.modes.threePlayer",
  "4p": "dashGsz.modes.fourPlayer",
  THREE_PLAYER: "dashGsz.modes.threePlayer",
  FOUR_PLAYER: "dashGsz.modes.fourPlayer",
};

const FORMAT_LABEL_KEYS: Record<string, string> = {
  tonpuu: "dashGsz.formats.tonpuuRound",
  hanchan: "dashGsz.formats.hanchan",
  TONPUU: "dashGsz.formats.tonpuuRound",
  HANCHAN: "dashGsz.formats.hanchan",
};

const TERMINATION_LABEL_KEYS: Record<string, string> = {
  score_complete: "dashGsz.terminations.scoreComplete",
  vote: "dashGsz.terminations.vote",
  admin_abort: "dashGsz.terminations.adminAbort",
  order_invalid: "dashGsz.terminations.orderInvalid",
  SCORE_COMPLETE: "dashGsz.terminations.scoreComplete",
  VOTE: "dashGsz.terminations.vote",
  ADMIN_ABORT: "dashGsz.terminations.adminAbort",
  ORDER_INVALID: "dashGsz.terminations.orderInvalid",
};

const PHASE_LABEL_KEYS: Record<string, string> = {
  seat_select: "dashGsz.phases.seatSelect",
  countdown: "dashGsz.phases.countdown",
  playing: "dashGsz.phases.playing",
  scoring: "dashGsz.phases.scoring",
  voting: "dashGsz.phases.voting",
};

const INCOMPLETE_REASONS = new Set(["admin_abort", "order_invalid"]);

export const Route = createFileRoute("/dash/gsz")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) ?? "",
    mode: ["all", "THREE_PLAYER", "FOUR_PLAYER"].includes(search.mode as string)
      ? (search.mode as ModeFilter)
      : "all",
    format: ["all", "TONPUU", "HANCHAN"].includes(search.format as string)
      ? (search.format as FormatFilter)
      : "all",
    completion: ["all", "completed", "incomplete"].includes(
      search.completion as string,
    )
      ? (search.completion as CompletionFilter)
      : "all",
    gszSync: ["all", "synced", "unsynced"].includes(search.gszSync as string)
      ? (search.gszSync as GszSyncFilter)
      : "all",
    table: (search.table as string) ?? "",
    startDate: (search.startDate as string) ?? "",
    endDate: (search.endDate as string) ?? "",
    page: Number(search.page) > 0 ? Number(search.page) : 1,
  }),
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
  const { t } = useTranslation();
  const client = useApolloClient();
  const isMobile = useIsMobile();
  const {
    q,
    mode,
    format,
    completion,
    gszSync,
    table,
    startDate,
    endDate,
    page,
  } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setSearch = useCallback(
    (
      updates: Partial<{
        q: string;
        mode: ModeFilter;
        format: FormatFilter;
        completion: CompletionFilter;
        gszSync: GszSyncFilter;
        table: string;
        startDate: string;
        endDate: string;
        page: number;
      }>,
    ) =>
      navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
    [navigate],
  );

  const [data, setData] = useState<MatchList | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableOptions, setTableOptions] = useState<TableOption[]>([]);

  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [activeLoading, setActiveLoading] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSyncing, setBatchSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const pageSize = 50;

  const unsyncableDialogRef = useRef<HTMLDialogElement>(null);
  const [unsyncableReasons, setUnsyncableReasons] = useState<
    Array<{
      nickname: string;
      userId: string;
      reason: string;
    }>
  >([]);

  const searchRef = useRef(q);
  useEffect(() => {
    searchRef.current = q;
  }, [q]);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    try {
      const result = await client.query({
        query: ManagedMahjongMatchesDocument,
        variables: {
          input: {
            search: searchRef.current || undefined,
            mode: mode === "all" ? undefined : (mode as any),
            format: format === "all" ? undefined : (format as any),
            completion:
              completion === "all"
                ? undefined
                : completion === "completed"
                  ? "COMPLETED"
                  : "INCOMPLETE",
            gszSync:
              gszSync === "all"
                ? undefined
                : gszSync === "synced"
                  ? "SYNCED"
                  : "UNSYNCED",
            tableId: table || undefined,
            startDate: startDate
              ? new Date(
                  dayjs.tz(startDate, "Asia/Shanghai").startOf("day").valueOf(),
                ).toISOString()
              : undefined,
            endDate: endDate
              ? new Date(
                  dayjs.tz(endDate, "Asia/Shanghai").endOf("day").valueOf(),
                ).toISOString()
              : undefined,
            pagination: {
              offset: (page - 1) * pageSize,
              limit: pageSize,
            },
          },
        },
      });
      setData(result.data?.managedMahjongMatches ?? null);
    } catch (err) {
      msg.error(
        err instanceof Error
          ? err.message
          : t("dashGsz.errors.fetchMatchesFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [
    mode,
    format,
    completion,
    gszSync,
    table,
    startDate,
    endDate,
    page,
    msg,
    t,
    client,
  ]);

  const fetchActive = useCallback(async () => {
    setActiveLoading(true);
    try {
      const result = await client.query({
        query: ActiveMahjongMatchesDocument,
      });
      setActiveMatches(result.data?.activeMahjongMatches ?? []);
    } catch {
      // noop
    } finally {
      setActiveLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    void fetchActive();
    const interval = setInterval(() => void fetchActive(), 10000);
    return () => clearInterval(interval);
  }, [fetchActive]);

  useEffect(() => {
    client
      .query({ query: MahjongTablesDocument })
      .then((result) => setTableOptions(result.data?.mahjongTables ?? []))
      .catch(() => {});
  }, [client]);

  const handleSearch = () => {
    setSearch({ page: 1 });
  };

  const handleCopy = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      msg.success(t("dashGsz.messages.copied"));
    } catch {
      msg.error(t("dashGsz.errors.clipboardDenied"));
    }
  };

  const handleTerminate = async (tableCode: string) => {
    try {
      await client.mutate({
        mutation: TerminateMahjongMatchDocument,
        variables: { tableCode, reason: "ADMIN_ABORT" },
      });
      msg.success(t("dashGsz.messages.terminated"));
      void fetchActive();
      void fetchMatches();
    } catch (err) {
      msg.error(
        err instanceof Error
          ? err.message
          : t("dashGsz.errors.terminateFailed"),
      );
    }
  };

  const handleSync = async (matchId: string) => {
    setSyncingId(matchId);
    try {
      const res = await client.mutate({
        mutation: SyncMahjongMatchToGszDocument,
        variables: { matchId },
      });
      const result = res.data?.syncMahjongMatchToGsz;
      if (result?.success) {
        msg.success(t("dashGsz.messages.syncSuccess"));
        void fetchMatches();
      } else {
        msg.error(result?.error ?? t("dashGsz.errors.syncFailed"));
      }
    } catch (err) {
      msg.error(
        err instanceof Error ? err.message : t("dashGsz.errors.syncFailed"),
      );
    } finally {
      setSyncingId(null);
    }
  };

  const handleBatchSync = async () => {
    if (selectedIds.size === 0) return;
    setBatchSyncing(true);
    try {
      const res = await client.mutate({
        mutation: BatchSyncMahjongMatchesToGszDocument,
        variables: { matchIds: [...selectedIds] },
      });
      const result = res.data?.batchSyncMahjongMatchesToGsz;
      msg.success(
        formatMessage(t("dashGsz.messages.batchSyncComplete"), {
          successCount: result?.successCount ?? 0,
          failCount: result?.failCount ?? 0,
        }),
      );
      setSelectedIds(new Set());
      void fetchMatches();
    } catch (err) {
      msg.error(
        err instanceof Error
          ? err.message
          : t("dashGsz.errors.batchSyncFailed"),
      );
    } finally {
      setBatchSyncing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const unsyncedItems = items.filter(
      (m) => m.matchType === MahjongMatchType.Tournament && !m.gszSynced,
    );
    if (unsyncedItems.every((m) => selectedIds.has(m.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unsyncedItems.map((m) => m.id)));
    }
  };

  const items = data?.items ?? [];
  const total = data?.pageInfo?.total ?? 0;
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
              placeholder={t("dashGsz.searchPlaceholder")}
              value={q}
              onChange={(e) => setSearch({ q: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(
            [
              ["all", t("dashGsz.filters.all")],
              ["THREE_PLAYER", t("dashGsz.modes.threePlayer")],
              ["FOUR_PLAYER", t("dashGsz.modes.fourPlayer")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${mode === key ? "btn-primary" : "btn-ghost"}`}
              onClick={() => {
                setSearch({ mode: key, page: 1 });
              }}
            >
              {label}
            </button>
          ))}

          <span className="text-base-content/30 mx-1">|</span>

          {(
            [
              ["all", t("dashGsz.filters.all")],
              ["HANCHAN", t("dashGsz.formats.hanchan")],
              ["TONPUU", t("dashGsz.formats.tonpuu")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${format === key ? "btn-secondary" : "btn-ghost"}`}
              onClick={() => {
                setSearch({ format: key, page: 1 });
              }}
            >
              {label}
            </button>
          ))}

          <span className="text-base-content/30 mx-1">|</span>

          {(
            [
              ["all", t("dashGsz.filters.all")],
              ["completed", t("dashGsz.filters.completed")],
              ["incomplete", t("dashGsz.filters.incomplete")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${completion === key ? "btn-accent" : "btn-ghost"}`}
              onClick={() => {
                setSearch({ completion: key, page: 1 });
              }}
            >
              {label}
            </button>
          ))}

          <span className="text-base-content/30 mx-1">|</span>

          {(
            [
              ["all", t("dashGsz.filters.all")],
              ["synced", t("dashGsz.filters.synced")],
              ["unsynced", t("dashGsz.filters.unsynced")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`btn btn-xs ${gszSync === key ? (key === "unsynced" ? "btn-warning" : "btn-success") : "btn-ghost"}`}
              onClick={() => {
                setSearch({ gszSync: key, page: 1 });
              }}
            >
              {label}
            </button>
          ))}

          {selectedIds.size > 0 && (
            <button
              type="button"
              className="btn btn-xs btn-warning"
              disabled={batchSyncing}
              onClick={handleBatchSync}
            >
              {batchSyncing ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <ArrowsClockwiseIcon className="size-3.5" />
              )}
              {formatMessage(t("dashGsz.batchSyncWithCount"), {
                count: selectedIds.size,
              })}
            </button>
          )}

          <div className="flex items-center gap-1 ml-auto shrink-0">
            {tableOptions.length > 0 && (
              <select
                className="select select-bordered select-xs"
                value={table}
                onChange={(e) => {
                  setSearch({ table: e.target.value, page: 1 });
                }}
              >
                <option value="">{t("dashGsz.allTables")}</option>
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
                setSearch({ startDate: e.target.value, page: 1 });
              }}
              title={t("dashGsz.startDate")}
            />
            <span className="text-xs text-base-content/50">~</span>
            <input
              type="date"
              className="input input-bordered input-xs"
              value={endDate}
              onChange={(e) => {
                setSearch({ endDate: e.target.value, page: 1 });
              }}
              title={t("dashGsz.endDate")}
            />
          </div>
        </div>
      </div>

      {!activeLoading && activeMatches.length > 0 && (
        <ActiveMatchesSection
          matches={activeMatches}
          onTerminate={handleTerminate}
          t={t}
        />
      )}

      <div className="w-full flex-1 min-h-0 overflow-auto">
        <table className="table table-lg table-pin-rows table-pin-cols min-w-[1300px]">
          <thead>
            <tr className="z-20">
              <td className="w-8">
                <input
                  type="checkbox"
                  className="checkbox checkbox-xs"
                  onChange={toggleSelectAll}
                  checked={
                    items.filter(
                      (m) =>
                        m.matchType === MahjongMatchType.Tournament &&
                        !m.gszSynced,
                    ).length > 0 &&
                    items
                      .filter(
                        (m) =>
                          m.matchType === MahjongMatchType.Tournament &&
                          !m.gszSynced,
                      )
                      .every((m) => selectedIds.has(m.id))
                  }
                />
              </td>
              <td className="whitespace-nowrap">ID</td>
              <td className="whitespace-nowrap">
                {t("dashGsz.columns.table")}
              </td>
              <td className="whitespace-nowrap">{t("dashGsz.columns.mode")}</td>
              <td className="whitespace-nowrap">
                {t("dashGsz.columns.format")}
              </td>
              <td className="whitespace-nowrap">
                {t("dashGsz.columns.startTime")}
              </td>
              <td className="whitespace-nowrap">
                {t("dashGsz.columns.endTime")}
              </td>
              <td className="whitespace-nowrap">
                {t("dashGsz.columns.players")}
              </td>
              <td className="whitespace-nowrap">
                {t("dashGsz.columns.terminationReason")}
              </td>
              <td className="whitespace-nowrap">{t("dashGsz.columns.sync")}</td>
              <th className="whitespace-nowrap">
                {t("dashGsz.columns.actions")}
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="py-12 text-center">
                  <span className="loading loading-dots loading-md" />
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="py-12 text-center text-base-content/60"
                >
                  {q.trim() ||
                  mode !== "all" ||
                  format !== "all" ||
                  completion !== "all" ||
                  gszSync !== "all" ||
                  table ||
                  startDate ||
                  endDate
                    ? t("dashGsz.noMatchedRecords")
                    : t("dashGsz.noRiichiData")}
                </td>
              </tr>
            ) : (
              items.map((match) => (
                <tr
                  key={match.id}
                  className={
                    INCOMPLETE_REASONS.has(match.terminationReason)
                      ? "opacity-60"
                      : ""
                  }
                >
                  <td>
                    {match.matchType === MahjongMatchType.Tournament &&
                      !match.gszSynced && (
                        <input
                          type="checkbox"
                          className="checkbox checkbox-xs"
                          checked={selectedIds.has(match.id)}
                          onChange={() => toggleSelect(match.id)}
                        />
                      )}
                  </td>
                  <td className="font-mono">
                    <div className="relative group flex items-center gap-1">
                      <span className="cursor-default">
                        {match.id.slice(0, 5)}
                      </span>
                      <button
                        type="button"
                        className="btn btn-xs btn-ghost btn-square shrink-0"
                        onClick={() => handleCopy(match.id)}
                        title={t("dashGsz.copyId")}
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
                      className={`badge badge-sm ${match.mode === MahjongMode.FourPlayer ? "badge-primary" : "badge-secondary"}`}
                    >
                      {MODE_LABEL_KEYS[match.mode]
                        ? t(MODE_LABEL_KEYS[match.mode])
                        : match.mode}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="badge badge-sm badge-outline">
                      {FORMAT_LABEL_KEYS[match.format]
                        ? t(FORMAT_LABEL_KEYS[match.format])
                        : match.format}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {formatTime(new Date(match.startedAt).getTime())}
                  </td>
                  <td className="whitespace-nowrap">
                    {formatTime(new Date(match.endedAt).getTime())}
                  </td>
                  <td
                    className="max-w-[200px] truncate"
                    title={match.players.map((p) => p.nickname).join(", ")}
                  >
                    {match.players.map((p) => p.nickname).join(", ") || "—"}
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      className={clsx(
                        "badge badge-sm",
                        INCOMPLETE_REASONS.has(match.terminationReason)
                          ? "badge-warning"
                          : "badge-ghost",
                      )}
                    >
                      {TERMINATION_LABEL_KEYS[match.terminationReason]
                        ? t(TERMINATION_LABEL_KEYS[match.terminationReason])
                        : match.terminationReason}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">
                    {match.matchType === MahjongMatchType.Tournament ? (
                      match.gszSynced ? (
                        <span className="badge badge-sm badge-success">
                          {t("dashGsz.synced")}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span
                            className="badge badge-sm badge-warning cursor-help"
                            title={match.gszError ?? t("dashGsz.unsynced")}
                          >
                            {t("dashGsz.unsynced")}
                          </span>
                          {match.unsyncableReasons.length > 0 && (
                            <button
                              type="button"
                              className="btn btn-xs btn-ghost btn-square text-error"
                              onClick={() => {
                                setUnsyncableReasons(match.unsyncableReasons);
                                unsyncableDialogRef.current?.showModal();
                              }}
                              title={t("dashGsz.unsyncable")}
                            >
                              <WarningCircleIcon className="size-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-xs btn-ghost btn-square"
                            disabled={syncingId === match.id}
                            onClick={() => handleSync(match.id)}
                            title={t("dashGsz.manualSync")}
                          >
                            {syncingId === match.id ? (
                              <span className="loading loading-spinner loading-xs" />
                            ) : (
                              <ArrowsClockwiseIcon className="size-3.5" />
                            )}
                          </button>
                        </div>
                      )
                    ) : (
                      <span className="badge badge-sm badge-ghost">—</span>
                    )}
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
                              {t("dashGsz.details")}
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
                        {t("dashGsz.details")}
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
            onClick={() => setSearch({ page: page - 1 })}
          >
            {t("dashGsz.previousPage")}
          </button>
          <span className="text-sm font-medium">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            disabled={page >= totalPages}
            onClick={() => setSearch({ page: page + 1 })}
          >
            {t("dashGsz.nextPage")}
          </button>
        </div>
      )}

      <dialog ref={unsyncableDialogRef} className="modal">
        <div className="modal-box max-w-sm">
          <h3 className="text-lg font-bold mb-3">
            {t("dashGsz.unsyncableReasons")}
          </h3>
          <div className="flex flex-col gap-2">
            {unsyncableReasons.map((r) => (
              <div
                key={r.userId}
                className="flex items-center gap-2 text-sm p-2 bg-base-200 rounded-lg"
              >
                <WarningCircleIcon className="size-4 text-error shrink-0" />
                <span className="font-medium">{r.nickname}</span>
                <span className="text-base-content/60">
                  {r.reason === "temp_user"
                    ? t("dashGsz.tempUser")
                    : t("dashGsz.noBoundPhone")}
                </span>
              </div>
            ))}
          </div>
          <div className="modal-action">
            <form method="dialog">
              <button type="submit" className="btn btn-sm">
                {t("dashGsz.close")}
              </button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </main>
  );
}

function ActiveMatchesSection({
  matches,
  onTerminate,
  t,
}: {
  matches: ActiveMatch[];
  onTerminate: (tableCode: string) => void;
  t: Translator;
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
        {formatMessage(t("dashGsz.activeWithCount"), { count: matches.length })}
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
                  className={`badge badge-xs ${m.mode === MahjongMode.FourPlayer ? "badge-primary" : "badge-secondary"}`}
                >
                  {MODE_LABEL_KEYS[m.mode]
                    ? t(MODE_LABEL_KEYS[m.mode])
                    : m.mode}
                </span>
                <span className="badge badge-xs badge-outline">
                  {FORMAT_LABEL_KEYS[m.format]
                    ? t(FORMAT_LABEL_KEYS[m.format])
                    : m.format}
                </span>
                <span className="badge badge-xs badge-info">
                  {PHASE_LABEL_KEYS[m.phase]
                    ? t(PHASE_LABEL_KEYS[m.phase])
                    : m.phase}
                </span>
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
              {t("dashGsz.terminate")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
