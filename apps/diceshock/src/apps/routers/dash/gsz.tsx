import {
  ArrowsClockwiseIcon,
  DotsThreeVerticalIcon,
  EyeIcon,
  StopIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import type { ColumnDef, SortingState } from "@tanstack/react-table";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "@/client/components/dash/DataTable";
import { DateRangeFilter } from "@/client/components/dash/DateRangeFilter";
import { usePendingSearch } from "@/client/components/dash/SearchBridge";
import { TableToolbar } from "@/client/components/dash/TableToolbar";
import { useSelectedTableData } from "@/client/components/dash/useSelectedTableData";
import type { BatchAction } from "@/client/components/diceshock/BatchActionBar";
import BatchActionBar from "@/client/components/diceshock/BatchActionBar";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import {
  MahjongMatchType,
  MahjongTerminationReason,
  SortOrder,
  useActiveMahjongMatchesQuery,
  useBatchSyncMahjongMatchesToGszMutation,
  useMahjongTablesQuery,
  useManagedMahjongMatchesQuery,
  useSyncMahjongMatchToGszMutation,
  useTerminateMahjongMatchMutation,
} from "@/client/graphql/__generated__";
import { useIsMobile } from "@/client/hooks/useIsMobile";
import { useTranslation } from "@/client/hooks/useTranslation";
import {
  GSZ_SEARCH_GRAMMAR,
  type ParsedSearch,
  parseSearch,
  serialize,
} from "@/client/lib/searchParser";
import { formatMessage } from "@/shared/i18n";
import dayjs from "@/shared/utils/dayjs-config";

const PAGE_SIZE = 50;

type Translator = ReturnType<typeof useTranslation>["t"];
type MatchesList = NonNullable<
  ReturnType<typeof useManagedMahjongMatchesQuery>["data"]
>["managedMahjongMatches"];
type MatchItem = NonNullable<MatchesList>["items"][number];
type ActiveMatch = NonNullable<
  NonNullable<
    ReturnType<typeof useActiveMahjongMatchesQuery>["data"]
  >["activeMahjongMatches"]
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

export function buildFilter(
  parsed: ParsedSearch,
  page: number,
  sorting: SortingState,
) {
  const modeFilter = parsed.filters.mode?.value;
  const formatFilter = parsed.filters.format?.value;
  const syncFilter = parsed.filters.sync?.value;
  const completionFilter = parsed.filters.completion?.value;
  const tableFilter = parsed.filters.table?.value;
  const dateFilter = parsed.filters.date?.value;

  const toArray = (v: unknown): string[] | undefined => {
    if (typeof v === "string") return [v];
    if (Array.isArray(v)) return v as string[];
    return undefined;
  };

  const modeMap: Record<string, string> = {
    "3p": "THREE_PLAYER",
    "4p": "FOUR_PLAYER",
  };
  const formatMap: Record<string, string> = {
    tonpuu: "TONPUU",
    hanchan: "HANCHAN",
  };
  const syncMap: Record<string, string> = {
    synced: "SYNCED",
    unsynced: "UNSYNCED",
  };
  const completionMap: Record<string, string> = {
    completed: "COMPLETED",
    incomplete: "INCOMPLETE",
  };

  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  if (dateFilter) {
    if (typeof dateFilter === "string") {
      dateFrom = dateTo = dateFilter;
    } else if (Array.isArray(dateFilter) && dateFilter.length === 2) {
      dateFrom = dateFilter[0];
      dateTo = dateFilter[1];
    }
  }

  return {
    search: parsed.freeText || undefined,
    mode: toArray(modeFilter)?.map((v) => modeMap[v] ?? v.toUpperCase()),
    format: toArray(formatFilter)?.map((v) => formatMap[v] ?? v.toUpperCase()),
    syncStatus: toArray(syncFilter)?.map((v) => syncMap[v] ?? v.toUpperCase()),
    completion: toArray(completionFilter)?.map(
      (v) => completionMap[v] ?? v.toUpperCase(),
    ),
    tableCode: typeof tableFilter === "string" ? tableFilter : undefined,
    dateFrom,
    dateTo,
    sortBy: sorting.length > 0 ? sorting[0].id : undefined,
    sortOrder: sorting[0]?.desc ? SortOrder.Desc : SortOrder.Asc,
    pagination: { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE },
  };
}

function RouteComponent() {
  const msg = useMsg();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { q, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchInput, setSearchInput] = useState(q);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [batchSyncing, setBatchSyncing] = useState(false);

  const unsyncableDialogRef = useRef<HTMLDialogElement>(null);
  const [unsyncableReasons, setUnsyncableReasons] = useState<
    Array<{ nickname: string; userId: string; reason: string }>
  >([]);

  const { pendingSearch, clearPendingSearch } = usePendingSearch();

  const setSearchParam = useCallback(
    (updates: Partial<{ q: string; page: number }>) =>
      navigate({ search: (prev) => ({ ...prev, ...updates }), replace: true }),
    [navigate],
  );

  useEffect(() => {
    if (pendingSearch !== null) {
      setSearchInput(pendingSearch);
      setSearchParam({ q: pendingSearch, page: 1 });
      clearPendingSearch();
    }
  }, [pendingSearch, clearPendingSearch, setSearchParam]);

  const parsed = useMemo(() => parseSearch(q, GSZ_SEARCH_GRAMMAR), [q]);
  const filter = useMemo(
    () => buildFilter(parsed, page, sorting),
    [parsed, page, sorting],
  );

  const { data, loading } = useManagedMahjongMatchesQuery({
    variables: { filter },
    onError: (err) => {
      msg.error(err.message || t("dashGsz.errors.fetchMatchesFailed"));
    },
  });

  const matches =
    (data?.managedMahjongMatches?.items as MatchItem[] | undefined) ?? [];

  const matchesList = data?.managedMahjongMatches ?? null;
  const total = matchesList?.pageInfo?.total ?? 0;
  const hasMore = matchesList?.pageInfo?.hasMore ?? false;
  const clearSelectedIds = useCallback(() => setSelectedIds(new Set()), []);
  useSelectedTableData({
    entityType: "日麻",
    rows: matches,
    selectedIds,
    getRowId: (match) => match.id,
    onClear: clearSelectedIds,
  });

  const { data: activeData, loading: activeLoading } =
    useActiveMahjongMatchesQuery({ pollInterval: 10000 });
  const activeMatches = activeData?.activeMahjongMatches ?? [];

  const { data: tablesData } = useMahjongTablesQuery();
  const tableOptions = tablesData?.mahjongTables ?? [];

  const [terminateMutation] = useTerminateMahjongMatchMutation({
    refetchQueries: ["ManagedMahjongMatches", "ActiveMahjongMatches"],
  });
  const [syncMutation] = useSyncMahjongMatchToGszMutation({
    refetchQueries: ["ManagedMahjongMatches"],
  });
  const [batchSyncMutation] = useBatchSyncMahjongMatchesToGszMutation({
    refetchQueries: ["ManagedMahjongMatches"],
  });

  const handleTerminate = async (tableCode: string) => {
    try {
      await terminateMutation({
        variables: { tableCode, reason: MahjongTerminationReason.AdminAbort },
      });
      msg.success(t("dashGsz.messages.terminated"));
    } catch (err) {
      msg.error(
        err instanceof Error
          ? err.message
          : t("dashGsz.errors.terminateFailed"),
      );
    }
  };

  const handleSync = useCallback(
    async (matchId: string) => {
      setSyncingId(matchId);
      try {
        const res = await syncMutation({ variables: { matchId } });
        const result = res.data?.syncMahjongMatchToGsz;
        if (result?.success) {
          msg.success(t("dashGsz.messages.syncSuccess"));
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
    },
    [syncMutation, msg, t],
  );

  const handleBatchSync = async () => {
    if (selectedIds.size === 0) return;
    setBatchSyncing(true);
    try {
      const res = await batchSyncMutation({
        variables: { matchIds: [...selectedIds] },
      });
      const result = res.data?.batchSyncMahjongMatchesToGsz;
      msg.success(
        formatMessage(t("dashGsz.messages.batchSyncComplete"), {
          successCount: result?.successCount ?? 0,
          failCount: result?.failCount ?? 0,
        }),
      );
      clearSelectedIds();
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

  const selectedActions: BatchAction[] = [
    {
      key: "sync-gsz",
      label: "同步到 GSZ",
      icon: batchSyncing ? (
        <span className="loading loading-spinner loading-xs" />
      ) : (
        <ArrowsClockwiseIcon className="size-4" />
      ),
      className: "btn-warning",
      disabled: batchSyncing,
      onClick: () => void handleBatchSync(),
    },
  ];

  const quickFilters = useMemo(() => {
    const modeVal = parsed.filters.mode?.value;
    const formatVal = parsed.filters.format?.value;
    const syncVal = parsed.filters.sync?.value;
    const completionVal = parsed.filters.completion?.value;

    const isActive = (filterVal: unknown, target: string): boolean => {
      if (typeof filterVal === "string") return filterVal === target;
      if (Array.isArray(filterVal)) return filterVal.includes(target);
      return false;
    };

    return [
      {
        label: t("dashGsz.modes.threePlayer"),
        key: "mode",
        value: "3p",
        active: isActive(modeVal, "3p"),
      },
      {
        label: t("dashGsz.modes.fourPlayer"),
        key: "mode",
        value: "4p",
        active: isActive(modeVal, "4p"),
      },
      {
        label: t("dashGsz.formats.tonpuuRound"),
        key: "format",
        value: "tonpuu",
        active: isActive(formatVal, "tonpuu"),
      },
      {
        label: t("dashGsz.formats.hanchan"),
        key: "format",
        value: "hanchan",
        active: isActive(formatVal, "hanchan"),
      },
      {
        label: t("dashGsz.filters.synced"),
        key: "sync",
        value: "synced",
        active: isActive(syncVal, "synced"),
      },
      {
        label: t("dashGsz.filters.unsynced"),
        key: "sync",
        value: "unsynced",
        active: isActive(syncVal, "unsynced"),
      },
      {
        label: t("dashGsz.filters.completed"),
        key: "completion",
        value: "completed",
        active: isActive(completionVal, "completed"),
      },
      {
        label: t("dashGsz.filters.incomplete"),
        key: "completion",
        value: "incomplete",
        active: isActive(completionVal, "incomplete"),
      },
    ];
  }, [parsed, t]);

  const columns = useMemo<ColumnDef<MatchItem, unknown>[]>(
    () => [
      {
        id: "table",
        header: t("dashGsz.columns.table"),
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.table?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "mode",
        header: t("dashGsz.columns.mode"),
        cell: ({ row }) => (
          <span
            className={`badge badge-sm ${row.original.mode === "FOUR_PLAYER" ? "badge-primary" : "badge-secondary"}`}
          >
            {MODE_LABEL_KEYS[row.original.mode]
              ? t(MODE_LABEL_KEYS[row.original.mode])
              : row.original.mode}
          </span>
        ),
      },
      {
        accessorKey: "format",
        header: t("dashGsz.columns.format"),
        cell: ({ row }) => (
          <span className="badge badge-sm badge-outline">
            {FORMAT_LABEL_KEYS[row.original.format]
              ? t(FORMAT_LABEL_KEYS[row.original.format])
              : row.original.format}
          </span>
        ),
      },
      {
        id: "startedAt",
        accessorFn: (row) => new Date(row.startedAt).getTime(),
        header: t("dashGsz.columns.startTime"),
        cell: ({ row }) =>
          formatTime(new Date(row.original.startedAt).getTime()),
        sortingFn: "basic",
      },
      {
        id: "endedAt",
        accessorFn: (row) => new Date(row.endedAt).getTime(),
        header: t("dashGsz.columns.endTime"),
        cell: ({ row }) => formatTime(new Date(row.original.endedAt).getTime()),
        sortingFn: "basic",
      },
      {
        id: "players",
        header: t("dashGsz.columns.players"),
        cell: ({ row }) => (
          <span
            className="max-w-[200px] truncate inline-block"
            title={row.original.players.map((p: MatchItem["players"][number]) => p.nickname).join(", ")}
          >
            {row.original.players.map((p: MatchItem["players"][number]) => p.nickname).join(", ") || "—"}
          </span>
        ),
      },
      {
        id: "terminationReason",
        accessorKey: "terminationReason",
        header: t("dashGsz.columns.terminationReason"),
        cell: ({ row }) => (
          <span
            className={clsx(
              "badge badge-sm",
              INCOMPLETE_REASONS.has(row.original.terminationReason)
                ? "badge-warning"
                : "badge-ghost",
            )}
          >
            {TERMINATION_LABEL_KEYS[row.original.terminationReason]
              ? t(TERMINATION_LABEL_KEYS[row.original.terminationReason])
              : row.original.terminationReason}
          </span>
        ),
      },
      {
        id: "sync",
        header: t("dashGsz.columns.sync"),
        cell: ({ row }) => {
          const match = row.original;
          if (match.matchType !== MahjongMatchType.Tournament) {
            return <span className="badge badge-sm badge-ghost">—</span>;
          }
          return match.gszSynced ? (
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
          );
        },
      },
    ],
    [t, syncingId, handleSync],
  );

  const hasEmptyFilter =
    !parsed.freeText && Object.keys(parsed.filters).length === 0;

  return (
    <main className="flex-1 min-h-0 flex flex-col">
      <div className="px-4 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <DashBackButton />
          <TableToolbar
            searchBar={{
              grammar: GSZ_SEARCH_GRAMMAR,
              value: searchInput,
              onChange: setSearchInput,
              onSubmit: (parsedResult) => {
                const serialized = serialize(parsedResult, GSZ_SEARCH_GRAMMAR);
                setSearchParam({ q: serialized, page: 1 });
              },
              placeholder: t("dashGsz.searchPlaceholder") ?? "Search matches…",
            }}
            quickFilters={quickFilters}
            extra={
              <div className="flex items-center gap-2">
                <DateRangeFilter
                  value={
                    parsed.filters.date
                      ? {
                          from: Array.isArray(parsed.filters.date.value)
                            ? parsed.filters.date.value[0]
                            : typeof parsed.filters.date.value === "string"
                              ? parsed.filters.date.value
                              : undefined,
                          to: Array.isArray(parsed.filters.date.value)
                            ? parsed.filters.date.value[1]
                            : typeof parsed.filters.date.value === "string"
                              ? parsed.filters.date.value
                              : undefined,
                        }
                      : undefined
                  }
                  onChange={(range) => {
                    const nextFilters = { ...parsed.filters };
                    if (!range) {
                      delete nextFilters.date;
                    } else if (range.from && range.to) {
                      nextFilters.date = { operator: "range", value: [range.from, range.to] };
                    } else if (range.from) {
                      nextFilters.date = { operator: "gt", value: range.from };
                    } else if (range.to) {
                      nextFilters.date = { operator: "lt", value: range.to };
                    }
                    const serialized = serialize(
                      { ...parsed, filters: nextFilters, errors: [] },
                      GSZ_SEARCH_GRAMMAR,
                    );
                    setSearchInput(serialized);
                    setSearchParam({ q: serialized, page: 1 });
                  }}
                />
                {tableOptions.length > 0 && (
                  <select
                    className="select select-bordered select-sm"
                    value={
                      typeof parsed.filters.table?.value === "string"
                        ? parsed.filters.table.value
                        : ""
                    }
                    onChange={(e) => {
                      const nextFilters = { ...parsed.filters };
                      if (e.target.value) {
                        nextFilters.table = {
                          operator: "eq",
                          value: e.target.value,
                        };
                      } else {
                        delete nextFilters.table;
                      }
                      const serialized = serialize(
                        { ...parsed, filters: nextFilters, errors: [] },
                        GSZ_SEARCH_GRAMMAR,
                      );
                      setSearchInput(serialized);
                      setSearchParam({ q: serialized, page: 1 });
                    }}
                  >
                    <option value="">{t("dashGsz.allTables")}</option>
                    {tableOptions.map((tbl: { id: string; name: string; code: string }) => (
                      <option key={tbl.id} value={tbl.code}>
                        {tbl.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            }
          />
        </div>
      </div>

      {!activeLoading && activeMatches.length > 0 && (
        <ActiveMatchesSection
          matches={activeMatches}
          onTerminate={handleTerminate}
          t={t}
        />
      )}

      <div className="flex-1 min-h-0">
        <DataTable
          columns={columns}
          data={matches}
          loading={loading}
          emptyMessage={
            hasEmptyFilter
              ? t("dashGsz.noRiichiData")
              : t("dashGsz.noMatchedRecords")
          }
          pagination={{
            offset: (page - 1) * PAGE_SIZE,
            limit: PAGE_SIZE,
            total,
            hasMore,
          }}
          onPaginationChange={(p) =>
            setSearchParam({
              page: Math.floor(p.offset / PAGE_SIZE) + 1,
            })
          }
          sorting={sorting}
          onSortingChange={setSorting}
          sortableColumns={["startedAt", "endedAt"]}
          getRowId={(row) => row.id}
          enableRowSelection={true}
          selectedRows={selectedIds}
          onSelectedRowsChange={setSelectedIds}
          renderActions={(row) =>
            isMobile ? (
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
                    <Link to="/dash/gsz/$id" params={{ id: row.id }}>
                      <EyeIcon className="size-4" />
                      {t("dashGsz.details")}
                    </Link>
                  </li>
                </ul>
              </div>
            ) : (
              <Link
                to="/dash/gsz/$id"
                params={{ id: row.id }}
                className="btn btn-xs btn-ghost"
              >
                <EyeIcon className="size-4" />
                {t("dashGsz.details")}
              </Link>
            )
          }
        />
      </div>

      <BatchActionBar
        count={selectedIds.size}
        actions={selectedActions}
        onClear={clearSelectedIds}
        unit="日麻记录"
      />

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
                  className={`badge badge-xs ${m.mode === "FOUR_PLAYER" ? "badge-primary" : "badge-secondary"}`}
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
                {m.players.map((p: ActiveMatch["players"][number]) => p.nickname).join(", ")}
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
