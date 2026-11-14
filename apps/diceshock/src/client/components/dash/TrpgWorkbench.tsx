import { ArrowClockwiseIcon, PlusIcon } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import {
  type TrpgSessionFieldsFragment,
  useTrpgDashboardQuery,
} from "@/client/graphql/__generated__/trpg";
import { useTranslation } from "@/client/hooks/useTranslation";
import { DataTable } from "./DataTable";
import { displayTime, ErrorMessage } from "./trpg/common";
import { MemberPanel } from "./trpg/MemberPanel";
import { SessionDetails } from "./trpg/SessionDetails";
import { SessionEditor } from "./trpg/SessionEditor";

export function TrpgWorkbench() {
  const { t } = useTranslation();
  const [storeId, setStoreId] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [editing, setEditing] = useState(false);
  const { data, loading, error, refetch } = useTrpgDashboardQuery({
    variables: { filters: { storeId: storeId || undefined, offset } },
    fetchPolicy: "network-only",
    notifyOnNetworkStatusChange: true,
  });
  const selected = data?.trpgSessions.items.find((s) => s.id === selectedId);
  const store = data?.trpgStores.find((s) => s.id === storeId);
  const columns = useMemo<ColumnDef<TrpgSessionFieldsFragment, unknown>[]>(
    () => [
      { accessorKey: "title", header: t("trpg.title"), size: 240 },
      { accessorKey: "storeName", header: t("trpg.store") },
      { accessorKey: "hostName", header: t("trpg.host") },
      {
        accessorKey: "startsAt",
        header: t("trpg.startsAt"),
        cell: ({ row }) =>
          displayTime(row.original.startsAt) || t("trpg.pendingTime"),
        size: 180,
      },
      {
        accessorKey: "status",
        header: t("trpg.state"),
        cell: ({ row }) => (
          <span className="badge badge-soft badge-sm">
            {t(`trpg.status.${row.original.status}`)}
          </span>
        ),
      },
      {
        accessorKey: "pendingCount",
        header: t("trpg.pendingCount"),
        size: 100,
      },
    ],
    [t],
  );
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dashNav.trpg")}</h1>
          <p className="mt-1 text-sm text-base-content/60">
            {t("trpg.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="trpg-store">
            {t("trpg.store")}
          </label>
          <select
            id="trpg-store"
            className="select"
            value={storeId}
            onChange={(e) => {
              setStoreId(e.target.value);
              setOffset(0);
              setSelectedId("");
              setEditing(false);
            }}
          >
            <option value="">{t("trpg.allStores")}</option>
            {data?.trpgStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!storeId || loading}
            onClick={() => {
              setSelectedId("");
              setEditing(true);
            }}
          >
            <PlusIcon size={18} />
            {t("trpg.create")}
          </button>
          <button
            type="button"
            className="btn btn-square"
            aria-label={t("trpg.refresh")}
            disabled={loading}
            onClick={() => void refetch().catch(() => {})}
          >
            <ArrowClockwiseIcon
              size={18}
              className={
                loading ? "animate-spin motion-reduce:animate-none" : ""
              }
            />
          </button>
        </div>
      </header>
      <ErrorMessage error={error?.message} />
      {!loading && !error && data?.trpgStores.length === 0 && (
        <div className="alert">{t("trpg.noAccess")}</div>
      )}
      {editing && (selected || storeId) && (
        <SessionEditor
          key={selected?.id || storeId}
          storeId={selected?.storeId || storeId}
          canReview={selected?.canReview ?? !!store?.canReview}
          session={selected}
          onSaved={() => refetch()}
          onClose={() => setEditing(false)}
        />
      )}
      {!editing && selected && (
        <SessionDetails
          key={selected.id}
          session={selected}
          onChanged={() => refetch()}
          onEdit={() => setEditing(true)}
          onClose={() => setSelectedId("")}
        />
      )}
      <section
        className="overflow-hidden rounded-box border border-base-300 bg-base-100"
        aria-label={t("trpg.sessions")}
      >
        <DataTable
          columns={columns}
          data={data?.trpgSessions.items ?? []}
          loading={loading}
          emptyMessage={error ? t("common.error") : t("trpg.noSessions")}
          renderActions={(row) => (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setSelectedId(row.id);
                setEditing(false);
              }}
            >
              {t("trpg.details")}
            </button>
          )}
        />
        <div className="flex items-center justify-between border-t border-base-200 p-3">
          <span className="text-sm text-base-content/60">
            {t("trpg.page", { page: offset / 30 + 1 })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm"
              disabled={offset === 0 || loading}
              onClick={() => {
                setOffset(offset - 30);
                setSelectedId("");
              }}
            >
              {t("trpg.previous")}
            </button>
            <button
              type="button"
              className="btn btn-sm"
              disabled={!data?.trpgSessions.hasMore || loading}
              onClick={() => {
                setOffset(offset + 30);
                setSelectedId("");
              }}
            >
              {t("trpg.next")}
            </button>
          </div>
        </div>
      </section>
      {store?.canReview && (
        <MemberPanel
          key={storeId}
          storeId={storeId}
          admin={!!data?.trpgProfile.admin}
        />
      )}
    </div>
  );
}
