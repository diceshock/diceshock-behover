import { useApolloClient } from "@apollo/client";
import { HashIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MyActiveOccupanciesDocument,
  type MyActiveOccupanciesQuery,
  OccupyTableDocument,
  OccupyTableWithTempIdentityDocument,
  TableByCodeDocument,
  type TableByCodeQuery,
  TempIdentityActiveOccupanciesDocument,
  type TempIdentityActiveOccupanciesQuery,
} from "@/client/graphql/__generated__";
import useAuth from "@/client/hooks/useAuth";
import useTempIdentity from "@/client/hooks/useTempIdentity";
import { useTranslation } from "@/client/hooks/useTranslation";
import type { SeatIdentity } from "@/shared/types";

export const Route = createFileRoute("/{-$storeLocale}/ready/$code")({
  component: ReadyPage,
});

const TYPE_LABEL_KEYS: Record<string, string> = {
  FIXED: "seat.fixedTable",
  SOLO: "seat.soloTable",
};

const SCOPE_LABEL_KEYS: Record<string, string> = {
  TRPG: "seat.scopeTrpg",
  BOARDGAME: "seat.scopeBoardgame",
  CONSOLE: "seat.scopeConsole",
  MAHJONG: "seat.scopeMahjong",
};

function useSeatIdentity(): SeatIdentity | null {
  const { userInfo } = useAuth();
  const { tempIdentity } = useTempIdentity();

  return useMemo(() => {
    if (userInfo) {
      return {
        kind: "real" as const,
        uid: userInfo.uid,
        nickname: userInfo.nickname,
        phone: userInfo.phone ?? null,
      };
    }
    if (tempIdentity) return tempIdentity;
    return null;
  }, [userInfo, tempIdentity]);
}

function ReadyPage() {
  const { code } = Route.useParams();
  const { t } = useTranslation();
  const identity = useSeatIdentity();
  const client = useApolloClient();

  const [tableData, setTableData] = useState<
    TableByCodeQuery["tableByCode"] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [occupying, setOccupying] = useState(false);
  const [existingOrders, setExistingOrders] = useState<
    Array<{ code: string; name: string; status: string }>
  >([]);

  const fetchTable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.query({
        query: TableByCodeDocument,
        variables: { code },
      });
      setTableData(data.tableByCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [code, client]);

  useEffect(() => {
    void fetchTable();
  }, [fetchTable]);

  useEffect(() => {
    if (!identity) return;
    if (identity.kind === "real") {
      client
        .query<MyActiveOccupanciesQuery>({
          query: MyActiveOccupanciesDocument,
        })
        .then(({ data }) => {
          setExistingOrders(
            data.myActiveOccupancies.filter((o) => o.code !== code),
          );
        })
        .catch(() => {});
    } else if (identity.kind === "temp") {
      client
        .query<TempIdentityActiveOccupanciesQuery>({
          query: TempIdentityActiveOccupanciesDocument,
          variables: { tempId: identity.tempId },
        })
        .then(({ data }) => {
          setExistingOrders(
            data.tempIdentityActiveOccupancies.filter((o) => o.code !== code),
          );
        })
        .catch(() => {});
    }
  }, [identity, code, client]);

  const table = tableData
    ? {
        id: tableData.id,
        name: tableData.name,
        type: tableData.type,
        scope: tableData.scope,
        status: tableData.status,
        capacity: tableData.capacity,
        code: tableData.code,
      }
    : null;

  const occupancies = tableData?.occupancies ?? [];
  const totalOccupied = occupancies.length;
  const isSolo = table?.type === "SOLO";
  const remainingCapacity = isSolo
    ? Number.MAX_SAFE_INTEGER
    : (table?.capacity ?? 0) - totalOccupied;

  const isExpired =
    identity?.kind === "temp" && Date.now() > identity.expiresAt;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (error && !table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="text-error text-center">{error}</p>
        <button className="btn btn-primary btn-sm" onClick={fetchTable}>
          {t("common.retry")}
        </button>
      </div>
    );
  }

  if (!table) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <p className="font-mono font-black text-[20vw] md:text-[14vw] lg:text-[10rem] leading-none text-primary/20 select-none">
          404
        </p>
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold -mt-2 md:-mt-4 lg:-mt-6">
          {t("seat.tableNotFound")}
        </h1>
        <p className="mt-3 text-base-content/60 text-sm max-w-sm text-center">
          {t("seat.tableNotFoundDesc")}
        </p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 flex flex-col gap-5">
        <TableInfoSection table={table} totalOccupied={totalOccupied} />
        <div className="alert alert-warning text-sm">
          <span>{t("seat.tempExpired")}</span>
        </div>
      </div>
    );
  }

  const handleOccupy = async () => {
    if (!identity || occupying) return;
    setOccupying(true);
    try {
      if (identity.kind === "temp") {
        await client.mutate({
          mutation: OccupyTableWithTempIdentityDocument,
          variables: {
            input: {
              tempId: identity.tempId,
              code,
            },
          },
        });
      } else {
        await client.mutate({
          mutation: OccupyTableDocument,
          variables: { input: { code } },
        });
      }
      window.location.href = `/t/${code}`;
    } catch (err) {
      const message = err instanceof Error ? err.message : "使用失败";
      if (message.startsWith("ALREADY_OCCUPIED:")) {
        const [, existingCode] = message.split(":");
        window.location.href = `/t/${existingCode}`;
      } else {
        setError(message);
        setOccupying(false);
      }
    }
  };

  if (!identity) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 flex flex-col gap-5">
        <TableInfoSection table={table} totalOccupied={totalOccupied} />
        <div className="flex items-center justify-center min-h-[20vh]">
          <span className="loading loading-spinner loading-lg" />
        </div>
      </div>
    );
  }

  if (remainingCapacity <= 0) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 flex flex-col gap-5">
        <TableInfoSection table={table} totalOccupied={totalOccupied} />
        <div className="alert alert-warning text-sm">
          <span>
            桌台已满 ({totalOccupied}/{table.capacity})
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 flex flex-col gap-5">
      {error && (
        <div className="alert alert-error alert-soft text-sm">
          <span>{error}</span>
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => setError(null)}
          >
            {t("common.close")}
          </button>
        </div>
      )}

      <TableInfoSection table={table} totalOccupied={totalOccupied} />

      {identity.kind === "temp" && (
        <div className="alert alert-info alert-soft text-xs">
          <span>
            {t("seat.tempIdentity")}
            {identity.nickname} · {t("seat.validUntil")}
            {new Date(identity.expiresAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {existingOrders.length > 0 && (
        <div className="alert alert-warning alert-soft text-sm">
          <span>
            {t("seat.hasActiveOrders", {
              names: existingOrders.map((o) => o.name).join("、"),
              status: existingOrders.some((o) => o.status === "ACTIVE")
                ? t("seat.active")
                : t("seat.paused"),
            })}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 bg-base-200 rounded-xl p-5">
        <button
          className={clsx(
            "btn btn-lg btn-primary font-bold",
            occupying && "btn-disabled",
          )}
          onClick={() => handleOccupy()}
          disabled={occupying}
        >
          {occupying ? (
            <span className="loading loading-spinner loading-sm" />
          ) : existingOrders.some((o) => o.status === "ACTIVE") ? (
            t("seat.pauseAndStart")
          ) : (
            t("seat.startTimer")
          )}
        </button>
      </div>
    </div>
  );
}

function TableInfoSection({
  table,
  totalOccupied,
}: {
  table: {
    name: string;
    code: string;
    type: string;
    scope: string;
    capacity: number;
  };
  totalOccupied: number;
}) {
  const { t } = useTranslation();
  const isSolo = table.type === "SOLO";
  return (
    <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{table.name}</h2>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "badge badge-sm",
              table.type === "SOLO" ? "badge-secondary" : "badge-info",
            )}
          >
            {t(TYPE_LABEL_KEYS[table.type]) ?? table.type}
          </span>
          <span className="badge badge-sm badge-outline">
            {t(SCOPE_LABEL_KEYS[table.scope]) ?? table.scope}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-base-content/60">
        <span className="flex items-center gap-1">
          <HashIcon className="size-3.5" />
          {table.code}
        </span>
        <span className="flex items-center gap-1">
          <UserIcon className="size-3.5" />
          {isSolo ? totalOccupied : `${totalOccupied}/${table.capacity}`}
        </span>
      </div>
    </div>
  );
}
