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
