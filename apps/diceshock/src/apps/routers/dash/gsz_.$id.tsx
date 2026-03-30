import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import DashBackButton from "@/client/components/diceshock/DashBackButton";
import { useMsg } from "@/client/components/diceshock/Msg";
import type { Seat, Wind } from "@/shared/mahjong/constants";
import { SEAT_LABELS, WIND_LABELS } from "@/shared/mahjong/constants";
import dayjs from "@/shared/utils/dayjs-config";
import { trpcClientDash } from "@/shared/utils/trpc";

type MatchDetail = Awaited<
  ReturnType<typeof trpcClientDash.gszManagement.getById.query>
>;
type PlayerJSON = MatchDetail["players"][number];
type RoundJSON = MatchDetail["round_history"][number];

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
};

const RESULT_LABELS: Record<string, string> = {
  dealer_win: "庄和",
  non_dealer_win: "闲和",
  draw: "流局",
};

export const Route = createFileRoute("/dash/gsz_/$id")({
  component: MatchDetailPage,
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

type Tab = "overview" | "rounds" | "dealer";

function MatchDetailPage() {
  const { id } = Route.useParams();
  const msg = useMsg();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");

  const fetchMatch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await trpcClientDash.gszManagement.getById.query({ id });
      setMatch(data);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载对局失败");
    } finally {
      setLoading(false);
    }
  }, [id, msg]);

  useEffect(() => {
    void fetchMatch();
  }, [fetchMatch]);

  if (loading) {
    return (
      <main className="size-full flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </main>
    );
  }

  if (!match) {
    return (
      <main className="size-full flex flex-col items-center justify-center gap-4">
        <p className="text-base-content/60">对局不存在</p>
        <DashBackButton to="/dash/gsz" />
      </main>
    );
  }

  const sortedPlayers = [...match.players].sort(
    (a, b) => b.finalScore - a.finalScore,
  );

  const durationMs = match.ended_at - match.started_at;
  const durationMin = Math.floor(durationMs / 60000);
  const durationStr =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin}m`;

  return (
    <main className="size-full overflow-y-auto">
      <div className="px-4 pt-4">
        <DashBackButton to="/dash/gsz" />
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 pb-20">
        <h1 className="text-2xl font-bold mb-2">公式战详情</h1>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span
            className={`badge ${match.mode === "4p" ? "badge-primary" : "badge-secondary"}`}
          >
            {MODE_LABELS[match.mode] ?? match.mode}
          </span>
          <span className="badge badge-outline">
            {FORMAT_LABELS[match.format] ?? match.format}
          </span>
          <span className="badge badge-ghost">
            {TERMINATION_LABELS[match.termination_reason] ??
              match.termination_reason}
          </span>
          {match.table && (
            <span className="badge badge-info badge-outline">
              {match.table.name}
            </span>
          )}
          <span className="text-sm text-base-content/50">{durationStr}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-base-200 rounded-lg p-3">
            <div className="text-xs text-base-content/50">开始时间</div>
            <div className="text-sm font-medium">
              {formatTime(match.started_at)}
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-3">
            <div className="text-xs text-base-content/50">结束时间</div>
            <div className="text-sm font-medium">
              {formatTime(match.ended_at)}
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-3">
            <div className="text-xs text-base-content/50">总局数</div>
            <div className="text-sm font-medium">
              {match.round_history.length}
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-3">
            <div className="text-xs text-base-content/50">对局ID</div>
            <div className="text-sm font-mono truncate" title={match.id}>
              {match.id}
            </div>
          </div>
        </div>

        <div role="tablist" className="tabs tabs-bordered mb-6">
          {(
            [
              ["overview", "玩家排名"],
              ["rounds", "每局详情"],
              ["dealer", "庄家流向"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              className={clsx("tab", tab === key && "tab-active")}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <PlayersOverview players={sortedPlayers} match={match} />
        )}
        {tab === "rounds" && (
          <RoundsDetail rounds={match.round_history} players={match.players} />
        )}
        {tab === "dealer" && (
          <DealerFlow rounds={match.round_history} players={match.players} />
        )}
      </div>
    </main>
  );
}

function PlayersOverview({
  players,
  match,
}: {
  players: PlayerJSON[];
  match: MatchDetail;
}) {
  return (
    <div className="flex flex-col gap-3">
      {players.map((p, i) => (
        <div
          key={p.userId}
          className="flex items-center justify-between p-4 bg-base-200 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "badge badge-lg font-bold",
                i === 0
                  ? "badge-warning"
                  : i === 1
                    ? "badge-ghost"
                    : "badge-ghost badge-outline",
              )}
            >
              #{i + 1}
            </span>
            <div>
              <div className="font-medium">{p.nickname}</div>
              <div className="flex items-center gap-2 text-xs text-base-content/50">
                {p.seat && <span>{SEAT_LABELS[p.seat as Seat] ?? p.seat}</span>}
                <span className="font-mono">{p.userId.slice(0, 8)}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div
              className={clsx(
                "text-xl font-mono font-bold",
                p.finalScore > 0
                  ? "text-success"
                  : p.finalScore < 0
                    ? "text-error"
                    : "",
              )}
            >
              {p.finalScore > 0 ? "+" : ""}
              {p.finalScore}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RoundsDetail({
  rounds,
  players,
}: {
  rounds: RoundJSON[];
  players: PlayerJSON[];
}) {
  if (rounds.length === 0) {
    return (
      <p className="text-center text-base-content/50 py-8">暂无对局记录</p>
    );
  }

  const playerMap = new Map(players.map((p) => [p.userId, p]));

  return (
    <div className="overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            <th className="whitespace-nowrap">局</th>
            <th className="whitespace-nowrap">风</th>
            <th className="whitespace-nowrap">本场</th>
            <th className="whitespace-nowrap">庄家</th>
            {players.map((p) => (
              <th key={p.userId} className="whitespace-nowrap text-center">
                {p.nickname}
              </th>
            ))}
            <th className="whitespace-nowrap">结果</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r, i) => {
            const dealer = playerMap.get(r.dealerUserId);
            return (
              <tr key={i}>
                <td className="font-mono">{r.round}</td>
                <td>{WIND_LABELS[r.wind as Wind] ?? r.wind}</td>
                <td className="font-mono">{r.honba}</td>
                <td className="whitespace-nowrap">
                  {dealer?.nickname ?? r.dealerUserId.slice(0, 6)}
                </td>
                {players.map((p) => {
                  const score = r.scores[p.userId] ?? 0;
                  const prevScore =
                    i > 0 ? (rounds[i - 1].scores[p.userId] ?? 0) : 0;
                  const diff = i === 0 ? score : score - prevScore;
                  return (
                    <td
                      key={p.userId}
                      className={clsx(
                        "text-center font-mono",
                        diff > 0 && "text-success",
                        diff < 0 && "text-error",
                      )}
                    >
                      {score}
                    </td>
                  );
                })}
                <td className="whitespace-nowrap">
                  <span className="badge badge-xs badge-ghost">
                    {RESULT_LABELS[r.result] ?? r.result}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DealerFlow({
  rounds,
  players,
}: {
  rounds: RoundJSON[];
  players: PlayerJSON[];
}) {
  if (rounds.length === 0) {
    return (
      <p className="text-center text-base-content/50 py-8">暂无对局记录</p>
    );
  }

  const playerMap = new Map(players.map((p) => [p.userId, p]));

  const dealerStints: Array<{
    nickname: string;
    seat: string;
    startRound: number;
    endRound: number;
    count: number;
  }> = [];

  let currentDealer = "";
  let stintStart = 0;

  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    if (r.dealerUserId !== currentDealer) {
      if (i > 0) {
        const prev = playerMap.get(currentDealer);
        dealerStints.push({
          nickname: prev?.nickname ?? currentDealer.slice(0, 6),
          seat: prev?.seat ?? "?",
          startRound: stintStart + 1,
          endRound: i,
          count: i - stintStart,
        });
      }
      currentDealer = r.dealerUserId;
      stintStart = i;
    }
  }

  if (currentDealer) {
    const prev = playerMap.get(currentDealer);
    dealerStints.push({
      nickname: prev?.nickname ?? currentDealer.slice(0, 6),
      seat: prev?.seat ?? "?",
      startRound: stintStart + 1,
      endRound: rounds.length,
      count: rounds.length - stintStart,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {dealerStints.map((stint, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 bg-base-200 rounded-lg"
          >
            <span className="badge badge-warning badge-sm">庄</span>
            <div className="flex-1">
              <span className="font-medium">{stint.nickname}</span>
              <span className="text-xs text-base-content/50 ml-2">
                ({SEAT_LABELS[stint.seat as Seat] ?? stint.seat})
              </span>
            </div>
            <div className="text-sm text-base-content/60">
              第{stint.startRound}
              {stint.startRound !== stint.endRound && `~${stint.endRound}`}局
            </div>
            <span className="badge badge-sm badge-outline">
              {stint.count}局
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold mb-3">逐局庄家</h3>
        <div className="flex flex-wrap gap-1">
          {rounds.map((r, i) => {
            const dealer = playerMap.get(r.dealerUserId);
            const seatLabel = SEAT_LABELS[(dealer?.seat ?? "") as Seat] ?? "?";
            return (
              <div
                key={i}
                className="flex flex-col items-center bg-base-200 rounded-lg px-2 py-1 min-w-[3rem]"
                title={`第${i + 1}局: ${dealer?.nickname ?? "?"}`}
              >
                <span className="text-[10px] text-base-content/40">
                  {i + 1}
                </span>
                <span className="text-xs font-bold">{seatLabel}</span>
                <span className="text-[10px] text-base-content/50 truncate max-w-[3rem]">
                  {dealer?.nickname ?? "?"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
