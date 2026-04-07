// ─── Mahjong Match Constants ───────────────────────────────────

/** Starting points for 3-player mahjong */
export const STARTING_POINTS_3P = 35000;

/** Starting points for 4-player mahjong */
export const STARTING_POINTS_4P = 25000;

/** Seats / wind positions */
export type Seat = "east" | "south" | "west" | "north";

export const SEATS_4P: readonly Seat[] = [
  "east",
  "south",
  "west",
  "north",
] as const;
export const SEATS_3P: readonly Seat[] = ["east", "south", "west"] as const;

/** Wind rounds */
export type Wind = "east" | "south";

export const WINDS: readonly Wind[] = ["east", "south"] as const;

/** Display labels (Chinese) */
export const SEAT_LABELS: Record<Seat, string> = {
  east: "东",
  south: "南",
  west: "西",
  north: "北",
};

export const WIND_LABELS: Record<Wind, string> = {
  east: "东",
  south: "南",
};

export const MATCH_TYPE_LABELS: Record<string, string> = {
  store: "店内",
  tournament: "立直麻将",
};

export const MODE_LABELS: Record<string, string> = {
  "3p": "三麻",
  "4p": "四麻",
};

export const FORMAT_LABELS: Record<string, string> = {
  tonpuu: "东风场",
  hanchan: "半庄",
};

export const TERMINATION_LABELS: Record<string, string> = {
  score_complete: "录分完成",
  vote: "投票结算",
  admin_abort: "管理员终止",
  order_invalid: "订单失效",
};

export const PHASE_LABELS: Record<string, string> = {
  config_select: "配置中",
  seat_select: "选座中",
  countdown: "倒计时",
  playing: "对局中",
  scoring: "录分中",
  voting: "投票中",
  ended: "已结束",
};

export const COUNTDOWN_SECONDS = 3;
