import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type useMahjongMatch from "@/client/hooks/useMahjongMatch";
import type { Seat } from "@/shared/mahjong/constants";
import {
  COUNTDOWN_SECONDS,
  MATCH_TYPE_LABELS,
  SEAT_LABELS,
  SEATS_3P,
  SEATS_4P,
} from "@/shared/mahjong/constants";
import * as engine from "@/shared/mahjong/engine";
import type {
  MatchFormat,
  MatchMode,
  MatchState,
  MatchType,
  PlayerState,
} from "@/shared/mahjong/types";

type MahjongActions = ReturnType<typeof useMahjongMatch>["actions"];

interface Props {
  state: MatchState | null;
  myPlayer: PlayerState | null;
  actions: MahjongActions;
  userId: string;
  nickname: string;
  phone: string | null;
  isTemp: boolean;
  registered: boolean;
  isPending: (actionType: string) => boolean;
  connected: boolean;
}

export default function MahjongMatchStepper({
  state,
  myPlayer,
  actions,
  userId,
  nickname,
  phone,
  isTemp,
  registered,
  isPending,
  connected,
}: Props) {
  if (isTemp && state?.config?.type === "tournament" && !import.meta.env.DEV) {
    return (
      <div className="alert alert-warning text-sm">
        <span>🔒 临时身份不支持公式战模式，请先登录。</span>
      </div>
    );
  }

  if (!registered && state?.config?.type === "tournament") {
    return <RegistrationGate phone={phone} />;
  }

  if (!state || state.phase === "config_select") {
    return (
      <ConfigSelectView
        state={state}
        actions={actions}
        isPending={isPending}
        connected={connected}
        isTemp={isTemp}
      />
    );
  }

  if (state.phase === "seat_select") {
    return (
      <SeatSelectView
        state={state}
        myPlayer={myPlayer}
        actions={actions}
        userId={userId}
        nickname={nickname}
        phone={phone}
        registered={registered}
        isPending={isPending}
        connected={connected}
      />
    );
  }

  if (state.phase === "countdown") {
    return <CountdownView />;
  }

  if (state.phase === "playing") {
    return (
      <PlayingView
        state={state}
        actions={actions}
        isPending={isPending}
        connected={connected}
      />
    );
  }

  if (state.phase === "scoring") {
    return (
      <ScoringView
        state={state}
        actions={actions}
        userId={userId}
        isPending={isPending}
        connected={connected}
      />
    );
  }

  if (state.phase === "voting") {
    return (
      <VotePanelView
        state={state}
        actions={actions}
        userId={userId}
        isPending={isPending}
        connected={connected}
      />
    );
  }

  if (state.phase === "ended") {
    return (
      <MatchResultView
        state={state}
        actions={actions}
        isPending={isPending}
        connected={connected}
      />
    );
  }

  return null;
}

function RegistrationGate({ phone }: { phone: string | null }) {
  if (!phone) {
    return (
      <div className="bg-base-200 rounded-2xl p-6 sm:p-8 flex flex-col gap-3 items-center">
        <span className="text-3xl">📱</span>
        <p className="text-base text-base-content/70">
          需要验证手机号才能参加公式战模式
        </p>
        <p className="text-sm text-base-content/50">请前往个人设置绑定手机号</p>
      </div>
    );
  }

  return (
    <div className="bg-base-200 rounded-2xl p-6 sm:p-8 flex flex-col gap-3 items-center">
      <span className="text-3xl">🀄</span>
      <p className="text-base text-base-content/70">尚未开通公式战模式</p>
      <p className="text-sm text-base-content/50">请前往个人设置开通</p>
    </div>
  );
}

function ConfigSelectView({
  state,
  actions,
  isPending,
  connected,
  isTemp,
}: {
  state: MatchState | null;
  actions: MahjongActions;
  isPending: (a: string) => boolean;
  connected: boolean;
  isTemp: boolean;
}) {
  const currentType: MatchType = state?.config?.type ?? "store";
  const currentMode: MatchMode = state?.config?.mode ?? "4p";
  const currentFormat: MatchFormat = state?.config?.format ?? "hanchan";
  const isTournament = currentType === "tournament";

  const applyConfig = (
    type: MatchType,
    mode: MatchMode,
    format: MatchFormat,
  ) => {
    actions.setConfig({ type, mode, format });
  };

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="bg-base-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="text-center text-sm text-base-content/50 font-medium">
          🀄 对局设置
        </div>

        <div className="flex gap-3">
          {[
            { value: "store" as MatchType, label: "🏠 店内", disabled: false },
            {
              value: "tournament" as MatchType,
              label: "🏆 公式战",
              disabled: isTemp,
            },
          ].map((opt) => {
            const active = currentType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={opt.disabled}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-2 rounded-xl px-3 py-4 transition-all text-lg font-bold",
                  active
                    ? "bg-primary text-primary-content ring-2 ring-primary/50 shadow-lg shadow-primary/20 scale-[1.02]"
                    : opt.disabled
                      ? "bg-base-300 opacity-40 cursor-not-allowed"
                      : "bg-base-300 hover:bg-base-300/80",
                )}
                onClick={() =>
                  applyConfig(
                    opt.value,
                    opt.value === "tournament" ? "4p" : currentMode,
                    opt.value === "tournament" ? "hanchan" : currentFormat,
                  )
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          {[
            { value: "3p" as MatchMode, label: "三麻" },
            { value: "4p" as MatchMode, label: "四麻" },
          ].map((opt) => {
            const active = currentMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isTournament}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 transition-all font-semibold",
                  isTournament && "opacity-50 cursor-not-allowed",
                  active
                    ? "bg-primary text-primary-content ring-2 ring-primary/50 shadow-md"
                    : "bg-base-300 hover:bg-base-300/80",
                )}
                onClick={() =>
                  applyConfig(currentType, opt.value, currentFormat)
                }
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3">
          {[
            { value: "tonpuu" as MatchFormat, label: "🌬️ 东风场" },
            { value: "hanchan" as MatchFormat, label: "🧭 半庄" },
          ].map((opt) => {
            const active = currentFormat === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={isTournament}
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 transition-all font-semibold",
                  isTournament && "opacity-50 cursor-not-allowed",
                  active
                    ? "bg-primary text-primary-content ring-2 ring-primary/50 shadow-md"
                    : "bg-base-300 hover:bg-base-300/80",
                )}
                onClick={() => applyConfig(currentType, currentMode, opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {isTournament && (
          <div className="text-xs text-center text-base-content/40">
            🔒 公式战模式固定为四麻·半庄
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn-primary btn-lg gap-2 shadow-md shadow-primary/25 w-full"
        disabled={!connected || isPending("mahjong_start_seat_select")}
        onClick={() => {
          actions.setConfig({
            type: currentType,
            mode: currentMode,
            format: currentFormat,
          });
          actions.startSeatSelect();
        }}
      >
        {isPending("mahjong_start_seat_select") ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          "🎮"
        )}
        开始对局
      </button>
    </div>
  );
}

function SeatSelectView({
  state,
  myPlayer,
  actions,
  userId,
  nickname,
  phone,
  registered,
  isPending,
  connected,
}: {
  state: MatchState;
  myPlayer: PlayerState | null;
  actions: MahjongActions;
  userId: string;
  nickname: string;
  phone: string | null;
  registered: boolean;
  isPending: (a: string) => boolean;
  connected: boolean;
}) {
  const currentMode = state.config?.mode ?? "4p";
  const seats = currentMode === "3p" ? SEATS_3P : SEATS_4P;
  const needed = currentMode === "3p" ? 3 : 4;
  const seatedCount = state.players.filter((p) => p.seat).length;
  const hasJoined = !!myPlayer;
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!hasJoined && !joinedRef.current) {
      joinedRef.current = true;
      actions.join(nickname, phone, registered);
    }
  }, [hasJoined, actions, nickname, phone, registered]);

  const typeBadge = state.config?.type
    ? MATCH_TYPE_LABELS[state.config.type]
    : "";

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="bg-base-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="text-base text-base-content/60 text-center font-medium">
          💺 选择座位
          {typeBadge && (
            <span className="badge badge-sm badge-outline ml-2">
              {typeBadge}
            </span>
          )}
        </div>

        <div className="text-sm text-base-content/40 text-center">
          {state.config?.mode === "3p" ? "三麻" : "四麻"} ·{" "}
          {state.config?.format === "tonpuu" ? "东风场" : "半庄"}
        </div>

        <div className="flex flex-col gap-2.5">
          {seats.map((seat) => (
            <SeatCard
              key={seat}
              seat={seat}
              occupant={state.players.find((p) => p.seat === seat) ?? null}
              isMine={
                state.players.find((p) => p.seat === seat)?.userId === userId
              }
              disabled={!hasJoined}
              onSelect={() => actions.selectSeat(seat)}
            />
          ))}
        </div>

        <div className="text-sm text-base-content/50 text-center">
          👥 {seatedCount}/{needed} 已就位
          {seatedCount === needed && (
            <span className="ml-1 text-success">✨ 即将开始!</span>
          )}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-outline btn-md gap-1.5 w-full"
        disabled={!connected || isPending("mahjong_back_to_config")}
        onClick={actions.backToConfig}
      >
        {isPending("mahjong_back_to_config") && (
          <span className="loading loading-spinner loading-xs" />
        )}
        ↩️ 返回重新选择
      </button>
    </div>
  );
}

const SEAT_EMOJIS: Record<Seat, string> = {
  east: "🀀",
  south: "🀁",
  west: "🀂",
  north: "🀃",
};

function SeatCard({
  seat,
  occupant,
  isMine,
  disabled,
  onSelect,
}: {
  seat: Seat;
  occupant: PlayerState | null;
  isMine: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const canClick = !disabled && (!occupant || isMine);

  return (
    <button
      type="button"
      disabled={!canClick}
      onClick={canClick ? onSelect : undefined}
      className={clsx(
        "flex items-center w-full rounded-xl px-4 py-4 transition-colors",
        isMine
          ? "bg-primary/15 ring-1 ring-primary"
          : occupant
            ? "bg-base-300 opacity-60"
            : "bg-base-300 hover:bg-base-300/80",
        !canClick && !isMine && "cursor-default",
      )}
    >
      <span className="text-2xl w-10 shrink-0">{SEAT_EMOJIS[seat]}</span>
      <span className="text-2xl font-bold w-10 shrink-0">
        {SEAT_LABELS[seat]}
      </span>

      <span
        className={clsx(
          "flex-1 text-left text-base truncate",
          occupant ? "font-semibold" : "text-base-content/40",
        )}
      >
        {occupant ? occupant.nickname : "— 空位 —"}
        {isMine && <span className="text-sm text-primary ml-1">⭐ 你</span>}
      </span>
    </button>
  );
}

function CountdownView() {
  const [display, setDisplay] = useState(0);
  const done = display >= COUNTDOWN_SECONDS;

  useEffect(() => {
    const start = performance.now();
    const totalMs = COUNTDOWN_SECONDS * 1000;
    let raf: number;

    const step = (now: number) => {
      const elapsed = now - start;
      const val = Math.min(
        COUNTDOWN_SECONDS,
        (elapsed / totalMs) * COUNTDOWN_SECONDS,
      );
      setDisplay(val);
      if (elapsed < totalMs) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const progress = (display / COUNTDOWN_SECONDS) * 100;
  const remaining = COUNTDOWN_SECONDS - display;
  const formatted = done ? null : remaining.toFixed(2).padStart(5, "0");

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16">
      <div
        className={clsx(
          "radial-progress transition-colors",
          done ? "text-success" : "text-primary",
        )}
        style={
          {
            "--value": Math.min(100, Math.max(0, progress)),
            "--size": "10rem",
            "--thickness": "6px",
          } as React.CSSProperties
        }
        role="progressbar"
      >
        <div className="flex flex-col items-center">
          {done ? (
            <span className="text-4xl font-bold text-success">开始!</span>
          ) : (
            <span className="text-3xl font-bold font-mono text-primary tabular-nums">
              {formatted}
            </span>
          )}
          {!done && (
            <span className="text-sm text-base-content/50 mt-1">准备...</span>
          )}
        </div>
      </div>
      <div className="text-base-content/40 text-sm">🀄 对局即将开始</div>
    </div>
  );
}

function PlayingView({
  state,
  actions,
  isPending,
  connected,
}: {
  state: MatchState;
  actions: MahjongActions;
  isPending: (a: string) => boolean;
  connected: boolean;
}) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!state.startedAt) return;
    const tick = () => {
      const raw = Date.now() - state.startedAt!;
      const diff = Math.floor((raw - state.pausedDuration) / 1000);
      const m = Math.floor(diff / 60);
      const s = diff % 60;
      setElapsed(`${m}:${s.toString().padStart(2, "0")}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state.startedAt, state.pausedDuration]);

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="bg-base-200 rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center gap-2">
        <span className="text-base-content/40 text-xs">🀄 对局进行中</span>
        <div className="flex items-center gap-2">
          <span className="text-lg">⏱️</span>
          <span className="text-4xl font-mono font-bold text-primary tabular-nums">
            {elapsed}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-lg w-full gap-2"
          disabled={!connected || isPending("mahjong_begin_scoring")}
          onClick={actions.beginScoring}
        >
          {isPending("mahjong_begin_scoring") ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            "📝"
          )}
          录分
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-md text-base-content/50 gap-1"
          disabled={!connected || isPending("mahjong_initiate_vote")}
          onClick={actions.initiateVote}
        >
          {isPending("mahjong_initiate_vote") && (
            <span className="loading loading-spinner loading-xs" />
          )}
          🛑 终止本场
        </button>
      </div>
    </div>
  );
}

function ScoringView({
  state,
  actions,
  userId,
  isPending,
  connected,
}: {
  state: MatchState;
  actions: MahjongActions;
  userId: string;
  isPending: (a: string) => boolean;
  connected: boolean;
}) {
  const [score, setScore] = useState("");
  const submitted = userId in state.pendingScores;
  const confirmed = state.scoreConfirmed[userId] === true;
  const allConfirmed = engine.allScoresConfirmed(state);

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="bg-base-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        <h3 className="text-xl font-bold text-center">📝 录分</h3>

        {!submitted ? (
          <>
            <input
              type="number"
              className="input input-bordered input-lg w-full text-center font-mono text-lg"
              placeholder="输入当前点数"
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary btn-lg w-full"
              disabled={
                !score || !connected || isPending("mahjong_submit_score")
              }
              onClick={() => {
                const pts = Number.parseInt(score, 10);
                if (Number.isNaN(pts)) return;
                actions.submitScore(pts);
              }}
            >
              {isPending("mahjong_submit_score") && (
                <span className="loading loading-spinner loading-xs" />
              )}
              📤 提交点数
            </button>
          </>
        ) : !confirmed ? (
          <div className="flex flex-col gap-3 items-center">
            <div className="text-center text-lg font-semibold py-2">
              📋 已提交:{" "}
              <span className="font-mono text-primary">
                {state.pendingScores[userId]}
              </span>{" "}
              点
            </div>
            <button
              type="button"
              className="btn btn-accent btn-lg w-full"
              disabled={!connected || isPending("mahjong_confirm_score")}
              onClick={actions.confirmScore}
            >
              {isPending("mahjong_confirm_score") && (
                <span className="loading loading-spinner loading-xs" />
              )}
              ✅ 确认
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 items-center">
            <div className="text-center text-success text-lg font-semibold py-2">
              ✅ 已确认:{" "}
              <span className="font-mono">{state.pendingScores[userId]}</span>{" "}
              点
            </div>
            {!allConfirmed && (
              <button
                type="button"
                className="btn btn-ghost btn-sm text-base-content/50"
                disabled={!connected || isPending("mahjong_cancel_confirm")}
                onClick={actions.cancelConfirm}
              >
                ↩️ 取消确认
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-base-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-2.5">
        <div className="text-xs text-base-content/40 text-center mb-1">
          👥 录分进度
        </div>
        {state.players.map((p) => {
          const hasScore = p.userId in state.pendingScores;
          const isConfirmed = state.scoreConfirmed[p.userId] === true;
          const isMe = p.userId === userId;
          const playerScore = state.pendingScores[p.userId];
          return (
            <div
              key={p.userId}
              className={clsx(
                "flex items-center justify-between px-4 py-3 rounded-xl",
                isMe ? "bg-primary/10" : "bg-base-300",
              )}
            >
              <div className="flex items-center gap-1.5">
                {p.seat && (
                  <span className="text-base">{SEAT_EMOJIS[p.seat]}</span>
                )}
                <span
                  className={clsx(
                    "text-base",
                    hasScore ? "font-semibold" : "text-base-content/40",
                  )}
                >
                  {p.nickname}
                </span>
                {isMe && <span className="text-xs text-primary">⭐</span>}
              </div>
              <div className="flex items-center gap-2">
                {isConfirmed ? (
                  <>
                    <span className="font-mono text-sm font-bold">
                      {playerScore}
                    </span>
                    <span className="text-sm text-success">✅</span>
                  </>
                ) : hasScore ? (
                  <>
                    <span className="font-mono text-sm font-bold text-base-content/70">
                      {playerScore}
                    </span>
                    <span className="text-sm text-warning">⏳</span>
                  </>
                ) : (
                  <span className="text-sm text-base-content/30">⬜ 等待</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn-outline btn-md w-full"
        disabled={!connected || isPending("mahjong_cancel_scoring")}
        onClick={actions.cancelScoring}
      >
        {isPending("mahjong_cancel_scoring") && (
          <span className="loading loading-spinner loading-xs" />
        )}
        ↩️ 返回对局
      </button>
    </div>
  );
}

const VOTE_TIMEOUT_SECONDS = 20;

function VotePanelView({
  state,
  actions,
  userId,
  isPending,
  connected,
}: {
  state: MatchState;
  actions: MahjongActions;
  userId: string;
  isPending: (a: string) => boolean;
  connected: boolean;
}) {
  const hasVoted = state.votes.some((v) => v.userId === userId);
  const yesCount = state.votes.filter((v) => v.vote).length;
  const totalPlayers = state.config?.mode === "3p" ? 3 : 4;
  const threshold = state.config?.mode === "3p" ? 2 : 3;

  const [remaining, setRemaining] = useState(() => {
    if (!state.voteStartedAt) return VOTE_TIMEOUT_SECONDS;
    const elapsed = Math.floor((Date.now() - state.voteStartedAt) / 1000);
    return Math.max(0, VOTE_TIMEOUT_SECONDS - elapsed);
  });

  useEffect(() => {
    if (!state.voteStartedAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - state.voteStartedAt!) / 1000);
      setRemaining(Math.max(0, VOTE_TIMEOUT_SECONDS - elapsed));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [state.voteStartedAt]);

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="bg-base-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        <h3 className="text-xl font-bold text-center">🗳️ 终止投票</h3>

        <div className="flex flex-col items-center gap-1">
          <div
            className="radial-progress text-primary"
            style={
              {
                "--value": (remaining / VOTE_TIMEOUT_SECONDS) * 100,
                "--size": "4rem",
                "--thickness": "4px",
              } as React.CSSProperties
            }
            role="progressbar"
          >
            <span className="text-lg font-mono font-bold">{remaining}</span>
          </div>
          <span className="text-xs text-base-content/50">
            ⏰ 倒计时结束将按当前票数决定
          </span>
        </div>

        <div className="text-base text-base-content/70 text-center">
          {yesCount}/{threshold} 同意（需要 {threshold}/{totalPlayers}）
        </div>

        <div className="flex flex-col gap-2.5">
          {state.players.map((p) => {
            const vote = state.votes.find((v) => v.userId === p.userId);
            return (
              <div
                key={p.userId}
                className="flex justify-between items-center px-4 py-3 bg-base-300 rounded-xl"
              >
                <span className="text-base font-semibold">{p.nickname}</span>
                <span className="text-base">
                  {vote ? (vote.vote ? "✅ 同意" : "❌ 反对") : "⏳ 等待"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {!hasVoted && (
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-success btn-lg flex-1"
            disabled={!connected || isPending("mahjong_cast_vote")}
            onClick={() => actions.castVote(true)}
          >
            {isPending("mahjong_cast_vote") && (
              <span className="loading loading-spinner loading-xs" />
            )}
            ✅ 同意结算
          </button>
          <button
            type="button"
            className="btn btn-error btn-lg flex-1"
            disabled={!connected || isPending("mahjong_cast_vote")}
            onClick={() => actions.castVote(false)}
          >
            ❌ 继续对局
          </button>
        </div>
      )}
    </div>
  );
}

function MatchResultView({
  state,
  actions,
  isPending,
  connected,
}: {
  state: MatchState;
  actions: MahjongActions;
  isPending: (a: string) => boolean;
  connected: boolean;
}) {
  const ranking = engine.getRanking(state);
  const RANK_EMOJIS = ["🥇", "🥈", "🥉", "4️⃣"];

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="bg-base-200 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 items-center">
        <h3 className="text-xl font-bold">🏁 对局结束</h3>

        <div className="badge badge-lg gap-1">
          {state.terminationReason === "vote"
            ? "🗳️ 投票终止"
            : state.terminationReason === "admin_abort"
              ? "⚠️ 管理员终止"
              : "✅ 对局结束"}
        </div>

        <div className="flex flex-col gap-2.5 w-full">
          {ranking.map((p) => (
            <div
              key={p.userId}
              className={clsx(
                "flex items-center justify-between px-4 py-3 rounded-xl",
                p.rank === 1
                  ? "bg-warning/10 ring-1 ring-warning/30"
                  : "bg-base-300",
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">
                  {RANK_EMOJIS[p.rank - 1] ?? `#${p.rank}`}
                </span>
                <span className="text-base font-semibold">{p.nickname}</span>
              </div>
              <span className="text-lg font-mono font-bold">
                {p.currentPoints}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-lg w-full gap-2"
        disabled={!connected || isPending("mahjong_reset")}
        onClick={() => actions.reset("to_config")}
      >
        {isPending("mahjong_reset") && (
          <span className="loading loading-spinner loading-xs" />
        )}
        🔄 重新配置
      </button>
    </div>
  );
}
