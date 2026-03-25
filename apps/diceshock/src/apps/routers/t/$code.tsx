import {
  ClockIcon,
  CurrencyDollarIcon,
  HashIcon,
  UserIcon,
  UsersIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useState } from "react";
import useAuth from "@/client/hooks/useAuth";
import useSeatTimer from "@/client/hooks/useSeatTimer";
import useTempIdentity from "@/client/hooks/useTempIdentity";
import type { SeatIdentity } from "@/shared/types";
import {
  calculatePrice,
  formatPrice,
  type SnapshotData,
} from "@/shared/utils/pricing";
import { generateTOTP, getRemainingSeconds } from "@/shared/utils/totp";
import trpcClientPublic from "@/shared/utils/trpc";

export const Route = createFileRoute("/t/$code")({
  component: SeatTimerPage,
});

const TYPE_LABELS: Record<string, string> = {
  mahjong: "麻将台",
  boardgame: "桌游台",
};

const TOTP_TIME_STEP = 30;

function formatElapsed(startAt: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - startAt) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDurationShort(startAt: number): string {
  const diffMin = Math.floor((Date.now() - startAt) / 60000);
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;
  if (hours > 0) return `${hours}h${minutes}m`;
  return `${minutes}m`;
}

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

function SeatTimerPage() {
  const { code } = Route.useParams();
  const identity = useSeatIdentity();
  const { tempIdentity } = useTempIdentity();
  const navigate = useNavigate();

  const [tableData, setTableData] = useState<Awaited<
    ReturnType<typeof trpcClientPublic.tables.getByCode.query>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seats, setSeats] = useState(1);
  const [occupying, setOccupying] = useState(false);
  const [pricingSnapshot, setPricingSnapshot] = useState<SnapshotData | null>(
    null,
  );

  const identityId =
    identity?.kind === "real"
      ? identity.uid
      : identity?.kind === "temp"
        ? identity.tempId
        : undefined;

  const { state: wsState, connected } = useSeatTimer({
    code,
    userId: identityId,
    role: "user",
    enabled: !!identity,
  });

  const fetchTable = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, published] = await Promise.all([
        trpcClientPublic.tables.getByCode.query({ code }),
        trpcClientPublic.pricing.getPublished.query(),
      ]);
      setTableData(data);
      setPricingSnapshot(published?.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void fetchTable();
  }, [fetchTable]);

  const table =
    wsState?.table ??
    (tableData
      ? {
          id: tableData.id,
          name: tableData.name,
          type: tableData.type,
          status: tableData.status,
          capacity: tableData.capacity,
          code: tableData.code,
        }
      : null);

  const occupancies = wsState?.occupancies ?? tableData?.occupancies ?? [];

  const totalOccupied = occupancies.reduce((sum, o) => sum + o.seats, 0);
  const remainingCapacity = (table?.capacity ?? 0) - totalOccupied;

  const myOccupancy = useMemo(() => {
    if (!identity) return null;
    if (identity.kind === "real") {
      return occupancies.find(
        (o) => o.uid === identity.uid || o.user_id === identity.uid,
      );
    }
    return occupancies.find(
      (o) =>
        o.temp_id === identity.tempId ||
        o.user_id === identity.tempId ||
        o.uid === `temp:${identity.tempId}`,
    );
  }, [occupancies, identity]);

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
        <TableInfoSection
          table={table}
          totalOccupied={totalOccupied}
          connected={connected}
        />
        <div className="alert alert-warning text-sm">
          <span>
            临时身份已过期（24小时），计时已停止。请刷新页面重新开始。
          </span>
        </div>
      </div>
    );
  }

  const handleOccupyWithSeats = async (count: number) => {
    if (!identity || occupying) return;
    setSeats(count);
    setOccupying(true);
    try {
      if (identity.kind === "temp") {
        await trpcClientPublic.tempIdentity.occupy.mutate({
          tempId: identity.tempId,
          code,
        });
      } else {
        await trpcClientPublic.tables.occupy.mutate({ code, seats: count });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "使用失败";
      if (message.startsWith("ALREADY_OCCUPIED:")) {
        const [, existingCode, existingName] = message.split(":");
        setError(`你正在使用 ${existingName}，跳转中...`);
        setTimeout(() => {
          void navigate({ to: "/t/$code", params: { code: existingCode } });
        }, 1500);
      } else {
        setError(message);
      }
    } finally {
      setOccupying(false);
    }
  };

  if (!myOccupancy && remainingCapacity > 0 && identity) {
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

        <TableInfoSection
          table={table}
          totalOccupied={totalOccupied}
          connected={connected}
        />

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

        {identity.kind === "temp" ? (
          <div className="flex flex-col gap-4 bg-base-200 rounded-xl p-5">
            <button
              className={clsx(
                "btn btn-lg btn-primary font-bold",
                occupying && "btn-disabled",
              )}
              onClick={() => handleOccupyWithSeats(1)}
              disabled={occupying}
            >
              {occupying ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                "开始记时"
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 bg-base-200 rounded-xl p-5">
            <h3 className="font-semibold text-base text-center">选择人数</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {Array.from({ length: remainingCapacity }, (_, i) => i + 1).map(
                (n) => (
                  <button
                    key={n}
                    className={clsx(
                      "btn btn-circle btn-lg text-xl font-bold",
                      occupying ? "btn-disabled" : "btn-primary btn-outline",
                    )}
                    onClick={() => handleOccupyWithSeats(n)}
                    disabled={occupying}
                  >
                    {occupying && seats === n ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      n
                    )}
                  </button>
                ),
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!myOccupancy && remainingCapacity <= 0) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-6 flex flex-col gap-5">
        <TableInfoSection
          table={table}
          totalOccupied={totalOccupied}
          connected={connected}
        />

        <div className="alert alert-warning text-sm">
          <span>
            桌台已满 ({totalOccupied}/{table.capacity})
          </span>
        </div>

        <OccupancyListSection
          occupancies={occupancies}
          identity={identity}
          tableType={table.type}
          snapshot={pricingSnapshot}
        />
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

      <TableInfoSection
        table={table}
        totalOccupied={totalOccupied}
        connected={connected}
      />

      {identity?.kind === "temp" && (
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

      {myOccupancy && <TimerSection startAt={myOccupancy.start_at} />}

      {myOccupancy && (
        <PricePreviewSection
          startAt={myOccupancy.start_at}
          tableType={table.type}
          snapshot={pricingSnapshot}
        />
      )}

      <TOTPSection identity={identity} />

      <OccupancyListSection
        occupancies={occupancies}
        identity={identity}
        tableType={table.type}
        snapshot={pricingSnapshot}
      />
    </div>
  );
}

function TableInfoSection({
  table,
  totalOccupied,
  connected,
}: {
  table: { name: string; code: string; type: string; capacity: number };
  totalOccupied: number;
  connected: boolean;
}) {
  return (
    <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{table.name}</h2>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "badge badge-sm",
              table.type === "mahjong" ? "badge-warning" : "badge-info",
            )}
          >
            {TYPE_LABELS[table.type] ?? table.type}
          </span>
          <span
            className={clsx(
              "size-2 rounded-full",
              connected ? "bg-success" : "bg-base-300",
            )}
          />
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-base-content/60">
        <span className="flex items-center gap-1">
          <HashIcon className="size-3.5" />
          {table.code}
        </span>
        <span className="flex items-center gap-1">
          <UsersIcon className="size-3.5" />
          {totalOccupied}/{table.capacity}
        </span>
      </div>
    </div>
  );
}

function TimerSection({ startAt }: { startAt: number }) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(startAt));

  useEffect(() => {
    setElapsed(formatElapsed(startAt));
    const timer = setInterval(() => setElapsed(formatElapsed(startAt)), 1000);
    return () => clearInterval(timer);
  }, [startAt]);

  return (
    <div className="bg-base-200 rounded-xl p-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-base-content/60 text-sm">
        <ClockIcon className="size-4" />
        <span>已使用时长</span>
      </div>
      <p className="font-mono text-4xl font-bold tracking-wider">{elapsed}</p>
    </div>
  );
}

function TOTPSection({ identity }: { identity: SeatIdentity | null }) {
  if (identity?.kind === "temp") {
    return <TempTOTPSection secret={identity.totpSecret} />;
  }
  return <RealTOTPSection />;
}

function RealTOTPSection() {
  const { code, remainingSeconds, isLoading, error } = __useTOTPImport(true);

  if (error) {
    return (
      <div className="bg-base-200 rounded-xl p-4 text-center text-sm text-error">
        {error}
      </div>
    );
  }

  return (
    <TOTPDisplay
      code={code}
      remainingSeconds={remainingSeconds}
      isLoading={isLoading}
    />
  );
}

function TempTOTPSection({ secret }: { secret: string }) {
  const [code, setCode] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(
    getRemainingSeconds(),
  );

  useEffect(() => {
    if (!secret) return;

    const tick = async () => {
      const newCode = await generateTOTP(secret);
      setCode(newCode);
      setRemainingSeconds(getRemainingSeconds());
    };

    void tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [secret]);

  return (
    <TOTPDisplay
      code={code}
      remainingSeconds={remainingSeconds}
      isLoading={!code}
    />
  );
}

function TOTPDisplay({
  code,
  remainingSeconds,
  isLoading,
}: {
  code: string;
  remainingSeconds: number;
  isLoading: boolean;
}) {
  const progress = remainingSeconds / TOTP_TIME_STEP;
  const circumference = 2 * Math.PI * 14;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="bg-base-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-base-content/50">活动验证码</span>
        {isLoading ? (
          <span className="loading loading-dots loading-sm" />
        ) : (
          <span className="font-mono text-2xl font-bold tracking-[0.25em]">
            {code || "------"}
          </span>
        )}
      </div>
      <div className="relative flex items-center justify-center">
        <svg className="size-8 -rotate-90" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-base-300"
          />
          <circle
            cx="16"
            cy="16"
            r="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className={clsx(
              "transition-all duration-1000 linear",
              remainingSeconds <= 5 ? "text-error" : "text-primary",
            )}
          />
        </svg>
        <span
          className={clsx(
            "absolute text-[10px] font-mono font-bold",
            remainingSeconds <= 5 ? "text-error" : "text-base-content",
          )}
        >
          {remainingSeconds}
        </span>
      </div>
    </div>
  );
}

import useTOTP from "@/client/hooks/useTOTP";

const __useTOTPImport = useTOTP;

function PricePreviewSection({
  startAt,
  tableType,
  snapshot,
}: {
  startAt: number;
  tableType: string;
  snapshot: SnapshotData | null;
}) {
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const result = calculatePrice(startAt, Date.now(), tableType, snapshot);
      setPrice(result ? formatPrice(result.finalPrice) : null);
    };
    tick();
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [startAt, tableType, snapshot]);

  if (!price) return null;

  return (
    <div className="bg-base-200 rounded-xl p-4 flex items-center justify-between">
      <div className="flex items-center gap-2 text-base-content/60 text-sm">
        <CurrencyDollarIcon className="size-4" />
        <span>预估费用</span>
      </div>
      <span className="font-mono text-xl font-bold">{price}</span>
    </div>
  );
}

function OccupancyListSection({
  occupancies,
  identity,
  tableType,
  snapshot,
}: {
  occupancies: Array<{
    id: string;
    user_id: string;
    temp_id?: string | null;
    nickname: string;
    uid: string | null;
    seats: number;
    start_at: number;
  }>;
  identity: SeatIdentity | null;
  tableType: string;
  snapshot: SnapshotData | null;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  if (occupancies.length === 0) {
    return (
      <div className="bg-base-200 rounded-xl p-4 text-center text-sm text-base-content/50">
        暂无使用
      </div>
    );
  }

  const isMe = (occ: (typeof occupancies)[number]) => {
    if (!identity) return false;
    if (identity.kind === "real") {
      return occ.uid === identity.uid || occ.user_id === identity.uid;
    }
    return (
      occ.temp_id === identity.tempId ||
      occ.user_id === identity.tempId ||
      occ.uid === `temp:${identity.tempId}`
    );
  };

  return (
    <div className="bg-base-200 rounded-xl p-4 flex flex-col gap-2">
      <h3 className="font-semibold text-sm flex items-center gap-1.5">
        <UserIcon className="size-4" />
        当前使用 ({occupancies.length})
      </h3>
      <div className="flex flex-col gap-1.5">
        {occupancies.map((occ) => {
          const mine = isMe(occ);
          return (
            <div
              key={occ.id}
              className={clsx(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                mine ? "bg-primary/10" : "bg-base-100",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {occ.nickname}
                  {mine && (
                    <span className="text-xs text-primary ml-1">(你)</span>
                  )}
                </span>
                {occ.uid && !occ.uid.startsWith("temp:") && (
                  <span className="text-xs text-base-content/40">
                    {occ.uid}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-base-content/60 text-xs">
                <span>{occ.seats}人</span>
                <span>{formatDurationShort(occ.start_at)}</span>
                {snapshot &&
                  (() => {
                    const p = calculatePrice(
                      occ.start_at,
                      Date.now(),
                      tableType,
                      snapshot,
                    );
                    return p ? (
                      <span className="font-mono">
                        {formatPrice(p.finalPrice)}
                      </span>
                    ) : null;
                  })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
