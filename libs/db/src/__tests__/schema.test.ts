import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  activesTable,
  eventsTable,
  leaderboardSnapshotsTable,
  mahjongMatchesTable,
  pricingSnapshotsTable,
  storeInventoryTable,
  storesTable,
  tablesTable,
  userInfoTable,
} from "../schema";

function columnsOf(table: Parameters<typeof getTableColumns>[0]) {
  return getTableColumns(table);
}

describe("multi-store schema", () => {
  it("defines the stores table", () => {
    const columns = columnsOf(storesTable);

    expect(getTableName(storesTable)).toBe("stores");
    expect(columns.id.columnType).toBe("SQLiteText");
    expect(columns.id.primary).toBe(true);
    expect(columns.code.columnType).toBe("SQLiteText");
    expect(columns.code.isUnique).toBe(true);
    expect(columns.name.notNull).toBe(true);
    expect(columns.address.notNull).toBe(false);
    expect(columns.is_active.columnType).toBe("SQLiteInteger");
    expect(columns.is_active.default).toBe(1);
    expect(columns.created_at.columnType).toBe("SQLiteTimestamp");
    expect(columns.created_at.hasDefault).toBe(true);
  });

  it("defines store inventory with nullable store and board game references", () => {
    const columns = columnsOf(storeInventoryTable);

    expect(getTableName(storeInventoryTable)).toBe("store_inventory");
    expect(columns.id.primary).toBe(true);
    expect(columns.store_id.columnType).toBe("SQLiteText");
    expect(columns.store_id.notNull).toBe(false);
    expect(columns.board_game_id.columnType).toBe("SQLiteText");
    expect(columns.board_game_id.notNull).toBe(false);
    expect(columns.quantity.columnType).toBe("SQLiteInteger");
    expect(columns.quantity.default).toBe(0);
    expect(columns.status.enumValues).toEqual([
      "available",
      "unavailable",
      "damaged",
    ]);
    expect(columns.notes.notNull).toBe(false);
    expect(columns.created_at.hasDefault).toBe(true);
  });

  it.each([
    ["tables", tablesTable],
    ["pricing snapshots", pricingSnapshotsTable],
    ["events", eventsTable],
    ["actives", activesTable],
    ["mahjong matches", mahjongMatchesTable],
    ["leaderboard snapshots", leaderboardSnapshotsTable],
  ])("adds a nullable store_id reference to %s", (_, table) => {
    const columns = columnsOf(table);

    expect(columns.store_id.columnType).toBe("SQLiteText");
    expect(columns.store_id.notNull).toBe(false);
  });

  it("adds nullable user store and locale preferences", () => {
    const columns = columnsOf(userInfoTable);

    expect(columns.preferred_store_id.columnType).toBe("SQLiteText");
    expect(columns.preferred_store_id.notNull).toBe(false);
    expect(columns.preferred_locale.columnType).toBe("SQLiteText");
    expect(columns.preferred_locale.notNull).toBe(false);
  });
});
