import { useApolloClient } from "@apollo/client";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr";
import { createFileRoute, Link } from "@tanstack/react-router";
import clsx from "clsx";
import { useCallback, useEffect, useState } from "react";
import { useMsg } from "@/client/components/diceshock/Msg";
import type { MahjongMatchQuery } from "@/client/graphql/__generated__";
import {
  MahjongFormat,
  MahjongMatchDocument,
  MahjongMode,
  SyncMahjongMatchToGszDocument,
  UpdateMahjongScoreDocument,
} from "@/client/graphql/__generated__";
import type { Seat } from "@/shared/mahjong/constants";
import { SEAT_LABELS } from "@/shared/mahjong/constants";
import { formatPP, getMatchPPIfValid } from "@/shared/mahjong/pp";
import type { MatchFormat, MatchMode, MatchType } from "@/shared/mahjong/types";
import dayjs from "@/shared/utils/dayjs-config";

type MatchDetail = NonNullable<MahjongMatchQuery["mahjongMatch"]>;
type PlayerJSON = MatchDetail["players"][number];

const MODE_LABELS: Record<string, string> = {
  FOUR_PLAYER: "四麻",
  THREE_PLAYER: "三麻",
};

const FORMAT_LABELS: Record<string, string> = {
  HANCHAN: "半庄",
  TONPUU: "东风场",
};

const MATCH_TYPE_LABELS: Record<string, string> = {
  store: "店内",
  tournament: "公式战",
};

const TERMINATION_LABELS: Record<string, string> = {
  score_complete: "录分完成",
  vote: "投票结算",
  admin_abort: "管理员终止",
  order_invalid: "订单失效",
};

function toMatchMode(mode: MahjongMode): MatchMode {
  return mode === MahjongMode.ThreePlayer ? "3p" : "4p";
}

function toMatchFormat(format: MahjongFormat): MatchFormat {
  return format === MahjongFormat.Tonpuu ? "tonpuu" : "hanchan";
}

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

function MatchDetailPage() {
  const { id } = Route.useParams();
  const msg = useMsg();
  const client = useApolloClient();

  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchMatch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.query({
        query: MahjongMatchDocument,
        variables: { id },
      });
      setMatch(data.mahjongMatch as MatchDetail);
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "加载对局失败");
    } finally {
      setLoading(false);
    }
  }, [id, client, msg]);

  const handleSync = useCallback(async () => {
    if (!match) return;
    setSyncing(true);
    try {
      const res = await client.mutate({
        mutation: SyncMahjongMatchToGszDocument,
        variables: { matchId: match.id },
      });
      const result = res.data?.syncMahjongMatchToGsz;
      if (result?.success) {
        msg.success("同步成功");
        void fetchMatch();
      } else {
        msg.error(result?.error ?? "同步失败");
      }
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "同步失败");
    } finally {
      setSyncing(false);
    }
  }, [match, client, msg, fetchMatch]);

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
        <Link to="/dash/gsz" search={{ q: "", page: 1 }} className="btn btn-primary btn-sm">返回列表</Link>
      </main>
    );
  }

  const sortedPlayers = [...match.players].sort(
    (a, b) => b.finalScore - a.finalScore,
  );

  const durationMs =
    new Date(match.endedAt).getTime() - new Date(match.startedAt).getTime();
  const durationMin = Math.floor(durationMs / 60000);
  const durationStr =
    durationMin >= 60
      ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
      : `${durationMin}m`;

  return (
    <main className="size-full overflow-y-auto">

      <div className="mx-auto w-full max-w-4xl px-4 pb-20">
        <h1 className="text-2xl font-bold mb-2">立直麻将详情</h1>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {match.matchType && (
            <span className="badge badge-primary">
              {MATCH_TYPE_LABELS[match.matchType.toLowerCase()] ??
                match.matchType}
            </span>
          )}
          <span
            className={`badge ${match.mode === "FOUR_PLAYER" ? "badge-primary" : "badge-secondary"}`}
          >
            {MODE_LABELS[match.mode] ?? match.mode}
          </span>
          <span className="badge badge-outline">
            {FORMAT_LABELS[match.format] ?? match.format}
          </span>
          <span className="badge badge-ghost">
            {TERMINATION_LABELS[match.terminationReason] ??
              match.terminationReason}
          </span>
          {match.table && (
            <span className="badge badge-info badge-outline">
              {match.table.name}
            </span>
          )}
          <span className="text-sm text-base-content/50">{durationStr}</span>
          {match.gszRecordId && (
            <span className="badge badge-success badge-outline badge-sm">
              GSZ #{match.gszRecordId}
            </span>
          )}
          {match.matchType === "TOURNAMENT" &&
            (match.gszSynced ? (
              <span className="badge badge-success badge-sm">已同步</span>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  className="badge badge-warning badge-sm cursor-help"
                  title={match.gszError ?? "未同步到公式战"}
                >
                  未同步
                </span>
                <button
                  type="button"
                  className="btn btn-xs btn-warning btn-outline"
                  disabled={syncing}
                  onClick={handleSync}
                >
                  {syncing ? (
                    <span className="loading loading-spinner loading-xs" />
                  ) : (
                    <ArrowsClockwiseIcon className="size-3.5" />
                  )}
                  同步
                </button>
              </div>
            ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          <div className="bg-base-200 rounded-lg p-3">
            <div className="text-xs text-base-content/50">开始时间</div>
            <div className="text-sm font-medium">
              {formatTime(new Date(match.startedAt).getTime())}
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-3">
            <div className="text-xs text-base-content/50">结束时间</div>
            <div className="text-sm font-medium">
              {formatTime(new Date(match.endedAt).getTime())}
            </div>
          </div>
          <div className="bg-base-200 rounded-lg p-3">
            <div className="text-xs text-base-content/50">对局ID</div>
            <div className="text-sm font-mono truncate" title={match.id}>
              {match.id}
            </div>
          </div>
        </div>

        <PlayersSection
          matchId={match.id}
          players={sortedPlayers}
          mode={toMatchMode(match.mode)}
          format={toMatchFormat(match.format)}
          matchType={(match.matchType?.toLowerCase() ?? "store") as MatchType}
          terminationReason={match.terminationReason}
          isTournament={match.matchType === "TOURNAMENT"}
          hasGszRecord={!!match.gszRecordId}
          onUpdated={fetchMatch}
        />
      </div>
    </main>
  );
}

function PlayersSection({
  matchId,
  players,
  mode,
  format,
  matchType,
  terminationReason,
  isTournament,
  hasGszRecord,
  onUpdated,
}: {
  matchId: string;
  players: PlayerJSON[];
  mode: MatchMode;
  format: MatchFormat;
  matchType: MatchType;
  terminationReason: string;
  isTournament: boolean;
  hasGszRecord: boolean;
  onUpdated: () => void;
}) {
  const msg = useMsg();
  const client = useApolloClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editScores, setEditScores] = useState<Record<string, string>>({});

  const ppResult = getMatchPPIfValid(
    players,
    mode,
    format,
    matchType,
    terminationReason,
  );
  const ppMap = ppResult
    ? new Map(ppResult.players.map((p) => [p.userId, p.totalPP]))
    : new Map<string, number>();

  const startEditing = useCallback(() => {
    const scores: Record<string, string> = {};
    for (const p of players) {
      scores[p.userId] = String(p.finalScore);
    }
    setEditScores(scores);
    setEditing(true);
  }, [players]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updatedPlayers = players.map((p) => ({
        ...p,
        finalScore: Number.parseInt(editScores[p.userId] ?? "0", 10),
      }));
      await client.mutate({
        mutation: UpdateMahjongScoreDocument,
        variables: { matchId, players: updatedPlayers },
      });
      msg.success(
        isTournament && hasGszRecord
          ? "分数已更新并同步到公式战"
          : "分数已更新",
      );
      setEditing(false);
      onUpdated();
    } catch (err) {
      msg.error(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }, [
    players,
    editScores,
    matchId,
    isTournament,
    hasGszRecord,
    client,
    msg,
    onUpdated,
  ]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">玩家分数</h2>
        {!editing ? (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={startEditing}
          >
            ✏️ 修改分数
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-ghost"
              disabled={saving}
              onClick={() => setEditing(false)}
            >
              取消
            </button>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                "保存"
              )}
            </button>
          </div>
        )}
      </div>

      {players.map((p, i) => {
        const pp = ppMap.get(p.userId);
        return (
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
                  {p.seat && (
                    <span>{SEAT_LABELS[p.seat as Seat] ?? p.seat}</span>
                  )}
                  <span className="font-mono">{p.userId.slice(0, 8)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!editing && pp != null && (
                <span
                  className={clsx(
                    "font-mono text-sm font-semibold",
                    pp > 0
                      ? "text-success"
                      : pp < 0
                        ? "text-error"
                        : "text-base-content/50",
                  )}
                >
                  {formatPP(pp)}
                  {isTournament ? " pp*" : " pp"}
                </span>
              )}
              <div className="text-right">
                {editing ? (
                  <input
                    type="number"
                    className="input input-bordered input-sm w-28 text-right font-mono"
                    value={editScores[p.userId] ?? ""}
                    onChange={(e) =>
                      setEditScores((prev) => ({
                        ...prev,
                        [p.userId]: e.target.value,
                      }))
                    }
                  />
                ) : (
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
                )}
              </div>
            </div>
          </div>
        );
      })}

      {isTournament && ppResult && (
        <div className="text-xs text-base-content/40 text-center">
          * 公式战 PP 为预估值
        </div>
      )}
    </div>
  );
}
