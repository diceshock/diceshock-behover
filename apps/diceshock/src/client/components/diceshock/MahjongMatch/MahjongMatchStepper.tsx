import {
  ArrowLeftIcon,
  CompassIcon,
  GlobeSimpleIcon,
  PlayIcon,
  StorefrontIcon,
  UsersFourIcon,
  UsersThreeIcon,
  WindIcon,
} from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import type useMahjongMatch from "@/client/hooks/useMahjongMatch";
import type { Seat } from "@/shared/mahjong/constants";
import {
  SEAT_LABELS,
  SEATS_3P,
  SEATS_4P,
  WIND_LABELS,
} from "@/shared/mahjong/constants";
import * as engine from "@/shared/mahjong/engine";
import type {
  MatchFormat,
  MatchMode,
  MatchState,
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
  if (isTemp && !import.meta.env.DEV) {
    return (
      <div className="alert alert-warning text-sm">
        <span>临时身份不支持公式战，请先登录。</span>
      </div>
    );
  }

  if (!registered) {
    return <RegistrationGate phone={phone} onRegister={actions.setConfig} />;
  }

  if (!state || state.phase === "lobby" || state.phase === "config_select") {
    return (
      <ConfigSelectView
        state={state}
        actions={actions}
        isPending={isPending}
        connected={connected}
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
        isPending={isPending}
        connected={connected}
      />
    );
  }

  if (state.phase === "playing") {
    return (
      <MatchBoardView
        state={state}
        myPlayer={myPlayer}
        actions={actions}
        isPending={isPending}
        connected={connected}
      />
    );
  }

  if (state.phase === "scoring") {
    return (
      <ScoreInputView
        state={state}
        actions={actions}
        userId={userId}
        isPending={isPending}
        connected={connected}
      />
    );
  }

  if (state.phase === "round_review") {
    return (
      <RoundReviewView
        state={state}
        actions={actions}
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

function RegistrationGate({
  phone,
  onRegister,
}: {
  phone: string | null;
  onRegister: MahjongActions["setConfig"];
}) {
  if (!phone) {
    return (
      <div className="flex flex-col gap-3 items-center py-8">
        <p className="text-base-content/70">需要验证手机号才能参加公式战</p>
        <p className="text-sm text-base-content/50">请前往个人设置绑定手机号</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 items-center py-8">
      <p className="text-base-content/70">尚未开通公式战</p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => onRegister({ mode: "4p", format: "hanchan" })}
      >
        一键开通
      </button>
    </div>
  );
}

const MODE_OPTIONS: {
  value: MatchMode;
  label: string;
  tag: string;
  Icon: typeof UsersThreeIcon;
  TagIcon: typeof StorefrontIcon;
}[] = [
  {
    value: "3p",
    label: "三麻",
    tag: "店内",
    Icon: UsersThreeIcon,
    TagIcon: StorefrontIcon,
  },
  {
    value: "4p",
    label: "四麻",
    tag: "全国",
    Icon: UsersFourIcon,
    TagIcon: GlobeSimpleIcon,
  },
];

const FORMAT_OPTIONS: {
  value: MatchFormat;
  label: string;
  Icon: typeof WindIcon;
}[] = [
  { value: "tonpuu", label: "东风场", Icon: WindIcon },
  { value: "hanchan", label: "半庄", Icon: CompassIcon },
];

function ConfigSelectView({
  state,
  actions,
  isPending,
  connected,
}: {
  state: MatchState | null;
  actions: MahjongActions;
  isPending: (a: string) => boolean;
  connected: boolean;
}) {
  const currentMode = state?.config?.mode ?? "4p";
  const currentFormat = state?.config?.format ?? "hanchan";

  const applyConfig = (mode: MatchMode, format: MatchFormat) => {
    actions.setConfig({ mode, format });
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          {MODE_OPTIONS.map((opt) => {
            const active = currentMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={clsx(
                  "flex-1 flex flex-col items-center gap-1.5 rounded-xl px-3 py-4 transition-all",
                  active
                    ? "bg-primary text-primary-content ring-2 ring-primary/50 shadow-lg shadow-primary/20 scale-[1.02]"
                    : "bg-base-200 hover:bg-base-300",
                )}
                onClick={() => applyConfig(opt.value, currentFormat)}
              >
                <opt.Icon
                  className="size-7"
                  weight={active ? "fill" : "duotone"}
                />
                <span className="text-base font-bold">{opt.label}</span>
                <span
                  className={clsx(
                    "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                    active
                      ? "bg-primary-content/15 text-primary-content/80"
                      : "bg-base-300 text-base-content/50",
                  )}
                >
                  <opt.TagIcon className="size-3" />
                  {opt.tag}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-3">
          {FORMAT_OPTIONS.map((opt) => {
            const active = currentFormat === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                className={clsx(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 transition-all",
                  active
                    ? "bg-primary text-primary-content ring-2 ring-primary/50 shadow-md shadow-primary/15"
                    : "bg-base-200 hover:bg-base-300",
                )}
                onClick={() => applyConfig(currentMode, opt.value)}
              >
                <opt.Icon
                  className="size-5"
                  weight={active ? "fill" : "duotone"}
                />
                <span className="font-semibold">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-lg gap-2 shadow-md shadow-primary/25"
        disabled={!connected || isPending("mahjong_start_seat_select")}
        onClick={actions.startSeatSelect}
      >
        {isPending("mahjong_start_seat_select") ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <PlayIcon className="size-5" weight="fill" />
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
  isPending,
  connected,
}: {
  state: MatchState;
  myPlayer: PlayerState | null;
  actions: MahjongActions;
  userId: string;
  nickname: string;
  phone: string | null;
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
      actions.join(nickname, phone, true);
    }
  }, [hasJoined, actions, nickname, phone]);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="text-sm text-base-content/60 text-center">
        {state.config?.mode === "3p" ? "三麻" : "四麻"} ·{" "}
        {state.config?.format === "tonpuu" ? "东风场" : "半庄"}
      </div>

      <div className="flex flex-col gap-2">
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

      <div className="text-xs text-base-content/50 text-center">
        {seatedCount}/{needed} 已选座
      </div>

      <button
        type="button"
        className="btn btn-outline btn-sm gap-1.5"
        disabled={!connected || isPending("mahjong_back_to_config")}
        onClick={actions.backToConfig}
      >
        {isPending("mahjong_back_to_config") ? (
          <span className="loading loading-spinner loading-xs" />
        ) : (
          <ArrowLeftIcon className="size-4" />
        )}
        返回重新选择
      </button>
    </div>
  );
}

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
        "flex items-center w-full rounded-xl px-4 py-3 transition-colors",
        isMine
          ? "bg-primary/15 ring-1 ring-primary"
          : occupant
            ? "bg-base-200 opacity-60"
            : "bg-base-200 hover:bg-base-300",
        !canClick && !isMine && "cursor-default",
      )}
    >
      <span className="text-2xl font-bold w-10 shrink-0">
        {SEAT_LABELS[seat]}
      </span>

      <span
        className={clsx(
          "flex-1 text-left text-sm truncate",
          occupant ? "font-medium" : "text-base-content/40",
        )}
      >
        {occupant ? occupant.nickname : "空位"}
        {isMine && <span className="text-xs text-primary ml-1">(你)</span>}
      </span>
    </button>
  );
}

function MatchBoardView({
  state,
  myPlayer,
  actions,
  isPending,
  connected,
}: {
  state: MatchState;
  myPlayer: PlayerState | null;
  actions: MahjongActions;
  isPending: (a: string) => boolean;
  connected: boolean;
}) {
  const dealer = state.players[state.currentRound.dealerIndex];
  const ranking = engine.getRanking(state);

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="text-center">
        <span className="badge badge-lg badge-primary">
          {WIND_LABELS[state.currentRound.wind]}
          {state.currentRound.roundNumber}局 · 本场{state.currentRound.honba}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {ranking.map((p) => (
          <div
            key={p.userId}
            className={clsx(
              "flex items-center justify-between p-3 rounded-lg",
              p.userId === myPlayer?.userId ? "bg-primary/10" : "bg-base-200",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="badge badge-sm">#{p.rank}</span>
              <span className="font-medium">{p.nickname}</span>
              {p.seat && (
                <span className="badge badge-xs badge-outline">
                  {SEAT_LABELS[p.seat]}
                </span>
              )}
              {p.userId === dealer?.userId && (
                <span className="badge badge-xs badge-warning">庄</span>
              )}
            </div>
            <span className="font-mono font-bold">{p.currentPoints}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className="btn btn-primary btn-lg w-full"
          disabled={!connected || isPending("mahjong_begin_scoring")}
          onClick={actions.beginScoring}
        >
          {isPending("mahjong_begin_scoring") && (
            <span className="loading loading-spinner loading-xs" />
          )}
          结束本局
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm text-base-content/50"
          disabled={!connected || isPending("mahjong_initiate_vote")}
          onClick={actions.initiateVote}
        >
          {isPending("mahjong_initiate_vote") && (
            <span className="loading loading-spinner loading-xs" />
          )}
          结算本场
        </button>
      </div>
    </div>
  );
}

function ScoreInputView({
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

  const dealer = state.players[state.currentRound.dealerIndex];
  const allSubmitted = engine.allScoresSubmitted(state);

  return (
    <div className="flex flex-col gap-4 py-4">
      <h3 className="text-lg font-bold text-center">录入点数</h3>

      {!submitted ? (
        <>
          <input
            type="number"
            className="input input-bordered input-lg w-full text-center font-mono"
            placeholder="输入当前点数"
            value={score}
            onChange={(e) => setScore(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-primary btn-lg"
            disabled={!score || !connected || isPending("mahjong_submit_score")}
            onClick={() => {
              const pts = Number.parseInt(score, 10);
              if (Number.isNaN(pts)) return;
              actions.submitScore(pts);
            }}
          >
            {isPending("mahjong_submit_score") && (
              <span className="loading loading-spinner loading-xs" />
            )}
            确认点数
          </button>
        </>
      ) : (
        <div className="text-center text-success">
          已提交: {state.pendingScores[userId]} 点
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {state.players.map((p) => {
          const hasScore = p.userId in state.pendingScores;
          const isMe = p.userId === userId;
          const isDealer = p.userId === dealer?.userId;
          return (
            <div
              key={p.userId}
              className={clsx(
                "flex items-center justify-between px-3 py-2 rounded-lg text-sm",
                isMe ? "bg-primary/10" : "bg-base-200",
              )}
            >
              <div className="flex items-center gap-1.5">
                {p.seat && (
                  <span className="badge badge-xs badge-outline">
                    {SEAT_LABELS[p.seat]}
                  </span>
                )}
                <span className={clsx(!hasScore && "text-base-content/40")}>
                  {p.nickname}
                </span>
                {isMe && <span className="text-xs text-primary">(你)</span>}
                {allSubmitted && isDealer && (
                  <span className="badge badge-xs badge-warning">庄</span>
                )}
              </div>
              {hasScore ? (
                <span className="font-mono font-bold">
                  {state.pendingScores[p.userId]}
                </span>
              ) : (
                <span className="text-xs text-base-content/30">等待录入</span>
              )}
            </div>
          );
        })}
      </div>

      {engine.allScoresSubmitted(state) && (
        <button
          type="button"
          className="btn btn-accent btn-lg"
          disabled={!connected || isPending("mahjong_confirm_scores")}
          onClick={actions.confirmScores}
        >
          {isPending("mahjong_confirm_scores") && (
            <span className="loading loading-spinner loading-xs" />
          )}
          确认全部点数
        </button>
      )}
    </div>
  );
}

function RoundReviewView({
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
  const [result, setResult] = useState<
    "dealer_win" | "non_dealer_win" | "draw" | ""
  >("");

  return (
    <div className="flex flex-col gap-4 py-4">
      <h3 className="text-lg font-bold text-center">本局总览</h3>

      <div className="flex flex-col gap-2">
        {state.players.map((p) => {
          const prev = p.currentPoints;
          const next = state.pendingScores[p.userId] ?? prev;
          const diff = next - prev;
          return (
            <div
              key={p.userId}
              className="flex justify-between p-2 bg-base-200 rounded-lg"
            >
              <span>{p.nickname}</span>
              <span className="font-mono">
                {next}{" "}
                <span
                  className={
                    diff > 0 ? "text-success" : diff < 0 ? "text-error" : ""
                  }
                >
                  ({diff > 0 ? "+" : ""}
                  {diff})
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">本局结果:</p>
        <div className="flex gap-2">
          {(["dealer_win", "non_dealer_win", "draw"] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={clsx(
                "btn btn-sm flex-1",
                result === r ? "btn-primary" : "btn-outline",
              )}
              onClick={() => setResult(r)}
            >
              {r === "dealer_win"
                ? "庄和"
                : r === "non_dealer_win"
                  ? "闲和"
                  : "流局"}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={!connected || isPending("mahjong_end_round")}
          onClick={() => actions.endRound(result)}
        >
          {isPending("mahjong_end_round") && (
            <span className="loading loading-spinner loading-xs" />
          )}
          确认并继续
        </button>
      )}
    </div>
  );
}

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

  return (
    <div className="flex flex-col gap-4 py-4 items-center">
      <h3 className="text-lg font-bold">投票结算本场</h3>

      <div className="text-sm text-base-content/70">
        {yesCount}/{threshold} 同意（需要 {threshold}/{totalPlayers}）
      </div>

      <div className="flex flex-col gap-1 w-full">
        {state.players.map((p) => {
          const vote = state.votes.find((v) => v.userId === p.userId);
          return (
            <div
              key={p.userId}
              className="flex justify-between p-2 bg-base-200 rounded"
            >
              <span>{p.nickname}</span>
              <span>
                {vote ? (vote.vote ? "✅ 同意" : "❌ 反对") : "⏳ 等待"}
              </span>
            </div>
          );
        })}
      </div>

      {!hasVoted && (
        <div className="flex gap-3">
          <button
            type="button"
            className="btn btn-success btn-lg"
            disabled={!connected || isPending("mahjong_cast_vote")}
            onClick={() => actions.castVote(true)}
          >
            {isPending("mahjong_cast_vote") && (
              <span className="loading loading-spinner loading-xs" />
            )}
            同意结算
          </button>
          <button
            type="button"
            className="btn btn-error btn-lg"
            disabled={!connected || isPending("mahjong_cast_vote")}
            onClick={() => actions.castVote(false)}
          >
            继续对局
          </button>
        </div>
      )}

      {state.votes.length === totalPlayers && (
        <button
          type="button"
          className="btn btn-primary"
          disabled={!connected || isPending("mahjong_resolve_vote")}
          onClick={actions.resolveVote}
        >
          {isPending("mahjong_resolve_vote") && (
            <span className="loading loading-spinner loading-xs" />
          )}
          确认投票结果
        </button>
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

  return (
    <div className="flex flex-col gap-4 py-4 items-center">
      <h3 className="text-lg font-bold">对局结束</h3>

      <div className="badge badge-lg">
        {state.terminationReason === "format_complete"
          ? "场制完成"
          : state.terminationReason === "bust"
            ? "有人飞了"
            : "投票结算"}
      </div>

      <div className="flex flex-col gap-2 w-full">
        {ranking.map((p) => (
          <div
            key={p.userId}
            className="flex items-center justify-between p-3 bg-base-200 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "badge",
                  p.rank === 1 ? "badge-warning" : "badge-ghost",
                )}
              >
                #{p.rank}
              </span>
              <span className="font-medium">{p.nickname}</span>
            </div>
            <span className="font-mono font-bold">{p.currentPoints}</span>
          </div>
        ))}
      </div>

      <div className="text-xs text-base-content/50">
        共 {state.roundHistory.length} 局
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={!connected || isPending("mahjong_reset")}
        onClick={actions.reset}
      >
        {isPending("mahjong_reset") && (
          <span className="loading loading-spinner loading-xs" />
        )}
        新的一场
      </button>
    </div>
  );
}
