import { HashIcon, UserIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import useTempIdentity from "@/client/hooks/useTempIdentity";
import type { SeatIdentity } from "@/shared/types";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/ready/$code")({
  component: ReadyPage,
});

const TYPE_LABELS: Record<string, string> = {
  fixed: "固定桌",
  solo: "散人桌",
};

const SCOPE_LABELS: Record<string, string> = {
  trpg: "跑团",
  boardgame: "桌游",
  console: "电玩",
  mahjong: "日麻",
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
  const identity = useSeatIdentity();

  const [tableData, setTableData] = useState<Awaited<
    ReturnType<typeof trpcClientPublic.tables.getByCode.query>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [occupying, setOccupying] = useState(false);

  const fetchTable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await trpcClientPublic.tables.getByCode.query({ code });
      setTableData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void fetchTable();
  }, [fetchTable]);

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
  const isSolo = table?.type === "solo";
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
          重试
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
          桌台不存在
        </h1>
        <p className="mt-3 text-base-content/60 text-sm max-w-sm text-center">
          该桌台可能已被移除或链接已失效。
        </p>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 flex flex-col gap-5">
        <TableInfoSection table={table} totalOccupied={totalOccupied} />
        <div className="alert alert-warning text-sm">
          <span>临时身份已过期（24小时），请刷新页面重新开始。</span>
        </div>
      </div>
    );
  }

  const handleOccupy = async () => {
    if (!identity || occupying) return;
    setOccupying(true);
    try {
      if (identity.kind === "temp") {
        await trpcClientPublic.tempIdentity.occupy.mutate({
          tempId: identity.tempId,
          code,
        });
      } else {
        await trpcClientPublic.tables.occupy.mutate({ code });
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
            关闭
          </button>
        </div>
      )}

      <TableInfoSection table={table} totalOccupied={totalOccupied} />

      {identity.kind === "temp" && (
        <div className="alert alert-info alert-soft text-xs">
          <span>
            临时身份: {identity.nickname} · 有效期至{" "}
            {new Date(identity.expiresAt).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
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
          ) : (
            "开始记时"
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
  const isSolo = table.type === "solo";
  return (
    <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{table.name}</h2>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "badge badge-sm",
              table.type === "solo" ? "badge-secondary" : "badge-info",
            )}
          >
            {TYPE_LABELS[table.type] ?? table.type}
          </span>
          <span className="badge badge-sm badge-outline">
            {SCOPE_LABELS[table.scope] ?? table.scope}
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
