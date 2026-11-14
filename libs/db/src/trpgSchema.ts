import { sql } from "drizzle-orm";
import * as sqlite from "drizzle-orm/sqlite-core";
import { storesTable, tablesTable, users } from "./schema";

// Not part of the auto-generated GraphQL schema: domain resolvers enforce access.
export const trpgAccess = sqlite.sqliteTable(
  "trpg_access",
  {
    userId: sqlite
      .text("user_id")
      .notNull()
      .references(() => users.id),
    storeId: sqlite
      .text("store_id")
      .notNull()
      .references(() => storesTable.id),
    staff: sqlite
      .integer("staff", { mode: "boolean" })
      .notNull()
      .default(false),
    host: sqlite.integer("host", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [sqlite.primaryKey({ columns: [t.userId, t.storeId] })],
);

export const trpgSessions = sqlite.sqliteTable(
  "trpg_sessions",
  {
    id: sqlite.text().primaryKey(),
    storeId: sqlite
      .text("store_id")
      .notNull()
      .references(() => storesTable.id),
    hostId: sqlite
      .text("host_id")
      .notNull()
      .references(() => users.id),
    tableId: sqlite.text("table_id").references(() => tablesTable.id),
    title: sqlite.text().notNull(),
    description: sqlite.text().notNull(),
    moduleName: sqlite.text("module_name").notNull(),
    gameSystem: sqlite.text("game_system").notNull(),
    status: sqlite
      .text({
        enum: ["pending", "returned", "published", "cancelled", "completed"],
      })
      .notNull(),
    startsAt: sqlite.integer("starts_at"),
    deadline: sqlite.integer(),
    priorityUntil: sqlite.integer("priority_until"),
    durationMinutes: sqlite.integer("duration_minutes").notNull(),
    feeCents: sqlite.integer("fee_cents").notNull(),
    capacity: sqlite.integer().notNull(),
    minimum: sqlite.integer().notNull(),
    timeHint: sqlite.text("time_hint").notNull().default(""),
    tags: sqlite.text({ mode: "json" }).$type<string[]>().notNull().default([]),
    revision: sqlite.integer().notNull().default(1),
    reason: sqlite.text(),
    changedBy: sqlite.text("changed_by").references(() => users.id),
    createdAt: sqlite.integer("created_at").notNull(),
    updatedAt: sqlite.integer("updated_at").notNull(),
  },
  (t) => [
    sqlite
      .index("trpg_sessions_store_schedule")
      .on(t.storeId, t.status, t.startsAt),
    sqlite
      .index("trpg_sessions_host_schedule")
      .on(t.hostId, t.status, t.startsAt),
    sqlite.check(
      "trpg_capacity",
      sql`${t.minimum} >= 1 AND ${t.minimum} <= ${t.capacity} AND ${t.capacity} <= 6`,
    ),
  ],
);

export const trpgRegistrations = sqlite.sqliteTable(
  "trpg_registrations",
  {
    id: sqlite.text().primaryKey(),
    sessionId: sqlite
      .text("session_id")
      .notNull()
      .references(() => trpgSessions.id),
    userId: sqlite
      .text("user_id")
      .notNull()
      .references(() => users.id),
    status: sqlite
      .text({
        enum: ["interested", "pending", "confirmed", "rejected", "withdrawn"],
      })
      .notNull(),
    reason: sqlite.text(),
    reviewedBy: sqlite.text("reviewed_by").references(() => users.id),
    reviewedAt: sqlite.integer("reviewed_at"),
    createdAt: sqlite.integer("created_at").notNull(),
  },
  (t) => [
    sqlite.index("trpg_registrations_user").on(t.userId, t.createdAt),
    sqlite
      .uniqueIndex("trpg_registration_active")
      .on(t.sessionId, t.userId)
      .where(sql`${t.status} IN ('interested', 'pending', 'confirmed')`),
  ],
);
export type TrpgSession = typeof trpgSessions.$inferSelect;
