import {
  CalendarDotsIcon,
  ClockIcon,
  CurrencyDollarIcon,
  HashIcon,
  PackageIcon,
  UserIcon,
} from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import QRCode from "qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DisconnectionOverlay from "@/client/components/diceshock/DisconnectionOverlay";
import MahjongMatchStepper from "@/client/components/diceshock/MahjongMatch/MahjongMatchStepper";
import NetworkSignalIndicator from "@/client/components/diceshock/NetworkSignalIndicator";
import useAuth from "@/client/hooks/useAuth";
import useCrossData from "@/client/hooks/useCrossData";
import useMahjongMatch from "@/client/hooks/useMahjongMatch";
import useNetworkQuality from "@/client/hooks/useNetworkQuality";
import useSeatTimer from "@/client/hooks/useSeatTimer";
import useTempIdentity from "@/client/hooks/useTempIdentity";
import { getLoginTime } from "@/client/hooks/useTOTP";
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
  validateSearch: (search: Record<string, unknown>) => ({
    from: (search.from as string) ?? "",
  }),
});

const pricingCache = { snapshot: null as SnapshotData | null };

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

function useSeatIdentity(): {
  identity: SeatIdentity | null;
  ready: boolean;
} {
  const { userInfo, status } = useAuth();
  const { tempIdentity, initialized } = useTempIdentity();

  const identity = useMemo(() => {
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
  const ready = status !== "loading" && status !== undefined && initialized;

  return { identity, ready };
}

function SeatTimerPage() {
  const { code } = Route.useParams();
  const { from } = Route.useSearch();
  const { identity, ready: identityReady } = useSeatIdentity();
  const { setUserInfoIm } = useAuth();
  const [redirectedFrom, setRedirectedFrom] = useState(from || "");

  const [tableData, setTableData] = useState<Awaited<
    ReturnType<typeof trpcClientPublic.tables.getByCode.query>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"main" | "mahjong">("main");

  const [gszRegistered, setGszRegistered] = useState(false);
  const [gszName, setGszName] = useState<string | null>(null);
  const gszCheckedRef = useRef(false);

  const [pricingSnapshot, setPricingSnapshot] = useState<SnapshotData | null>(
    pricingCache.snapshot,
  );

  const identityId =
    identity?.kind === "real"
      ? identity.uid
      : identity?.kind === "temp"
        ? identity.tempId
        : undefined;

  const {
    state: wsState,
    connected,
    sendMessage,
    onPongMessage,
  } = useSeatTimer({
    code,
    userId: identityId,
    role: "user",
    enabled: !!identity,
  });

  const networkQuality = useNetworkQuality({
    sendMessage,
    connected,
    onPongMessage,
  });

  const mahjong = useMahjongMatch({
    wsState,
    sendMessage,
    userId: identityId ?? "",
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
      pricingCache.snapshot = published?.data ?? null;
      setPricingSnapshot(pricingCache.snapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void fetchTable();
  }, [fetchTable]);

  useEffect(() => {
    if (identity?.kind !== "real" || gszCheckedRef.current) return;
    gszCheckedRef.current = true;
    trpcClientPublic.mahjong.checkRegistration
      .query()
      .then((result) => {
        setGszRegistered(result.registered);
        setGszName(result.gszName ?? null);
      })
      .catch(() => {});
  }, [identity]);

  const handleGszRegistered = useCallback(
    (name: string, nicknameSynced: boolean) => {
      setGszRegistered(true);
      setGszName(name);
      if (nicknameSynced) {
        setUserInfoIm((draft) => {
          if (draft) draft.nickname = name;
        });
      }
    },
    [setUserInfoIm],
  );

  const wsHydrated =
    wsState != null && (wsState.table != null || wsState.step > 0);

  const table =
    (wsHydrated ? wsState.table : null) ??
    (tableData
      ? {
          id: tableData.id,
          name: tableData.name,
          type: tableData.type,
          scope: tableData.scope,
          status: tableData.status,
          capacity: tableData.capacity,
          code: tableData.code,
        }
      : null);

  const occupancies =
    (wsHydrated ? wsState.occupancies : null) ?? tableData?.occupancies ?? [];

  const totalOccupied = occupancies.length;

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

  const hadOccupancyRef = useRef(false);
  useEffect(() => {
    if (myOccupancy) {
      hadOccupancyRef.current = true;
      return;
    }
    if (!identityReady || !identity) return;

    if (hadOccupancyRef.current && wsHydrated) {
      window.location.href = `/ready/${code}`;
      return;
    }

    if (!loading && !hadOccupancyRef.current && (wsHydrated || tableData)) {
      window.location.href = `/ready/${code}`;
    }
  }, [
    myOccupancy,
    wsHydrated,
    tableData,
    loading,
    identity,
    identityReady,
    code,
  ]);

  const isExpired =
    identity?.kind === "temp" && Date.now() > identity.expiresAt;

  if (loading && !wsState) {
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
          signalLevel={networkQuality.signalLevel}
        />
        <div className="alert alert-warning text-sm">
          <span>
            临时身份已过期（24小时），计时已停止。请刷新页面重新开始。
          </span>
        </div>
      </div>
    );
  }

  const isMahjong = table?.scope === "mahjong";

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 flex flex-col gap-5">
      <DisconnectionOverlay visible={!connected && !!wsState} retryCount={0} />
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

      {redirectedFrom && (
        <div className="alert alert-warning alert-soft text-sm">
          <span>
            你正在 {table?.name} 计时中，已从 {redirectedFrom} 跳转至此
          </span>
          <button
            className="btn btn-xs btn-ghost"
            onClick={() => setRedirectedFrom("")}
          >
            关闭
          </button>
        </div>
      )}

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

      <div role="tablist" className="tabs tabs-bordered">
        <button
          type="button"
          role="tab"
          className={clsx("tab", activeTab === "main" && "tab-active")}
          onClick={() => setActiveTab("main")}
        >
          主页
        </button>
        {isMahjong && (
          <button
            type="button"
            role="tab"
            className={clsx("tab", activeTab === "mahjong" && "tab-active")}
            onClick={() => setActiveTab("mahjong")}
          >
            立直麻将
          </button>
        )}
      </div>

      {activeTab === "main" && (
        <>
          <TableInfoSection
            table={table}
            totalOccupied={totalOccupied}
            connected={connected}
            signalLevel={networkQuality.signalLevel}
          />

          {myOccupancy && <TimerSection startAt={myOccupancy.start_at} />}

          {myOccupancy && (
            <PricePreviewSection
              startAt={myOccupancy.start_at}
              tableType={table.scope}
              snapshot={pricingSnapshot}
            />
          )}

          <TOTPSection identity={identity} />

          <div className="grid grid-cols-2 gap-3">
            {isMahjong && (
              <button
                type="button"
                className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer col-span-2"
                onClick={() => setActiveTab("mahjong")}
              >
                <div className="card-body p-4 flex-row items-center gap-3">
                  <span className="w-6 h-6 flex items-center justify-center text-primary font-bold text-base leading-none select-none">
                    🀀
                  </span>
                  <span className="text-sm font-medium">立直麻将</span>
                </div>
              </button>
            )}
            <Link
              to="/inventory"
              className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
            >
              <div className="card-body p-4 flex-row items-center gap-3">
                <PackageIcon
                  className="w-6 h-6 text-primary"
                  weight="duotone"
                />
                <span className="text-sm font-medium">库存</span>
              </div>
            </Link>
            <Link
              to="/actives"
              className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
            >
              <div className="card-body p-4 flex-row items-center gap-3">
                <CalendarDotsIcon
                  className="w-6 h-6 text-primary"
                  weight="duotone"
                />
                <span className="text-sm font-medium">约局</span>
              </div>
            </Link>
          </div>

          <OccupancyListSection
            occupancies={occupancies}
            identity={identity}
            tableType={table.scope}
            snapshot={pricingSnapshot}
          />
        </>
      )}

      {activeTab === "mahjong" && isMahjong && (
        <MahjongMatchStepper
          state={mahjong.state}
          myPlayer={mahjong.myPlayer}
          actions={mahjong.actions}
          userId={identityId ?? ""}
          nickname={identity?.nickname ?? ""}
          phone={identity?.kind === "real" ? identity.phone : null}
          isTemp={identity?.kind === "temp"}
          registered={gszRegistered}
          gszName={gszName}
          onGszRegistered={handleGszRegistered}
          isPending={mahjong.isPending}
          connected={connected}
        />
      )}
    </div>
  );
}

function TableInfoSection({
  table,
  totalOccupied,
  connected,
  signalLevel,
}: {
  table: {
    name: string;
    code: string;
    type: string;
    scope: string;
    capacity: number;
  };
  totalOccupied: number;
  connected: boolean;
  signalLevel: 0 | 1 | 2 | 3 | 4;
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
          <NetworkSignalIndicator signalLevel={signalLevel} />
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
  const crossData = useCrossData();
  const userAgentRef = useRef(
    crossData?.UserAgentMeta?.userAgent ?? navigator.userAgent,
  );
  const loginTimeRef = useRef(getLoginTime() || Date.now());

  const qrPayload = useMemo(() => {
    if (!code) return null;
    return `{"totp":"${code}","ua":"${userAgentRef.current}","lt":${loginTimeRef.current}}`;
  }, [code]);

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
      qrPayload={qrPayload}
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

  const qrPayload = useMemo(() => {
    if (!code) return null;
    return `{"totp":"${code}"}`;
  }, [code]);

  return (
    <TOTPDisplay
      code={code}
      remainingSeconds={remainingSeconds}
      isLoading={!code}
      qrPayload={qrPayload}
    />
  );
}

function TOTPDisplay({
  code,
  remainingSeconds,
  isLoading,
  qrPayload,
}: {
  code: string;
  remainingSeconds: number;
  isLoading: boolean;
  qrPayload: string | null;
}) {
  const progress = remainingSeconds / TOTP_TIME_STEP;
  const circumference = 2 * Math.PI * 14;
  const dashOffset = circumference * (1 - progress);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrError, setQrError] = useState(false);
  const prevQrPayloadRef = useRef<string | null>(null);

  useEffect(() => {
    if (!qrPayload || !canvasRef.current) return;
    if (qrPayload === prevQrPayloadRef.current) return;
    prevQrPayloadRef.current = qrPayload;

    setQrError(false);
    QRCode.toCanvas(canvasRef.current, qrPayload, {
      width: 200,
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
    }).catch(() => setQrError(true));
  }, [qrPayload]);

  return (
    <div className="bg-base-200 rounded-xl p-4 flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full">
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

      {!isLoading && (
        <div className="bg-white rounded-lg p-2">
          {qrError ? (
            <div className="size-[200px] flex items-center justify-center text-error text-sm">
              二维码生成失败
            </div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>
      )}
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
