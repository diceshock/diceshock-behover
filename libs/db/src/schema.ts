import type { AdapterAccountType } from "@auth/core/adapters";
import type { BoardGame } from "@lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import * as sqlite from "drizzle-orm/sqlite-core";

export const boardGamesTable = sqlite.sqliteTable("board_games_table", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  sch_name: sqlite.text(),
  eng_name: sqlite.text(),
  gstone_id: sqlite.int(),
  gstone_rating: sqlite.real(),
  category: sqlite
    .text({ mode: "json" })
    .$type<BoardGame.BoardGameCol["category"]>(),
  mode: sqlite.text({ mode: "json" }).$type<BoardGame.BoardGameCol["mode"]>(),
  player_num: sqlite.text({ mode: "json" }).$type<number[]>(),
  best_player_num: sqlite.text({ mode: "json" }).$type<number[]>(),
  content: sqlite.blob({ mode: "json" }).$type<BoardGame.BoardGameCol>(),
  removeDate: sqlite
    .integer({ mode: "timestamp_ms" })
    .$default(() => new Date(0)),
});

export const users = sqlite.sqliteTable("user", {
  id: sqlite
    .text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: sqlite.text("name"),
  email: sqlite.text("email").unique(),
  emailVerified: sqlite.integer("emailVerified", { mode: "timestamp_ms" }),
  image: sqlite.text("image"),
});

export const userInfoTable = sqlite.sqliteTable("user_info", {
  id: sqlite
    .text("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  uid: sqlite.text("uid").notNull(),
  create_at: sqlite
    .integer("create_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
  nickname: sqlite.text("nickname").notNull(),
  phone: sqlite.text("phone"),
});

export const userBusinessCardTable = sqlite.sqliteTable("user_business_card", {
  id: sqlite
    .text("id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  share_phone: sqlite.int({ mode: "boolean" }).$default(() => false), // 是否分享手机号码
  wechat: sqlite.text(), // 微信号码
  qq: sqlite.text(), // QQ号码
  custom_content: sqlite.text(), // 自定义内容
  create_at: sqlite
    .integer("create_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
  update_at: sqlite
    .integer("update_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
});

export const userInfoRelations = relations(userInfoTable, ({ one }) => ({
  user: one(users, {
    fields: [userInfoTable.id],
    references: [users.id],
  }),
}));

export const userBusinessCardRelations = relations(
  userBusinessCardTable,
  ({ one }) => ({
    user: one(users, {
      fields: [userBusinessCardTable.id],
      references: [users.id],
    }),
  }),
);

export const usersRelations = relations(users, ({ one, many }) => ({
  userInfo: one(userInfoTable, {
    fields: [users.id],
    references: [userInfoTable.id],
  }),
  createdActives: many(activesTable),
  activeRegistrations: many(activeRegistrationsTable),
  membershipPlans: many(userMembershipPlansTable),
  tableOccupancies: many(tableOccupancyTable),
}));

export const activesTable = sqlite.sqliteTable("actives", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  creator_id: sqlite
    .text()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: sqlite.text().notNull(),
  board_game_id: sqlite
    .text("board_game_id")
    .references(() => boardGamesTable.id),
  date: sqlite.text().notNull(), // "YYYY-MM-DD"
  time: sqlite.text(), // "HH:mm"
  max_players: sqlite.int().notNull(),
  content: sqlite.text(), // tiptap JSON
  is_game: sqlite.int({ mode: "boolean" }).$default(() => true),
  create_at: sqlite
    .integer("create_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
  update_at: sqlite
    .integer("update_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
});

export const activeRegistrationsTable = sqlite.sqliteTable(
  "active_registrations",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    active_id: sqlite
      .text()
      .notNull()
      .references(() => activesTable.id, { onDelete: "cascade" }),
    user_id: sqlite
      .text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    is_watching: sqlite.int({ mode: "boolean" }).$default(() => false),
    create_at: sqlite
      .integer("create_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
);

export const activesRelations = relations(activesTable, ({ one, many }) => ({
  creator: one(users, {
    fields: [activesTable.creator_id],
    references: [users.id],
  }),
  boardGame: one(boardGamesTable, {
    fields: [activesTable.board_game_id],
    references: [boardGamesTable.id],
  }),
  registrations: many(activeRegistrationsTable),
}));

export const activeRegistrationsRelations = relations(
  activeRegistrationsTable,
  ({ one }) => ({
    active: one(activesTable, {
      fields: [activeRegistrationsTable.active_id],
      references: [activesTable.id],
    }),
    user: one(users, {
      fields: [activeRegistrationsTable.user_id],
      references: [users.id],
    }),
  }),
);

export const eventsTable = sqlite.sqliteTable("events", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  title: sqlite.text().notNull(),
  description: sqlite.text(),
  cover_image_url: sqlite.text(),
  content: sqlite.text(),
  is_published: sqlite.int({ mode: "boolean" }).$default(() => false),
  create_at: sqlite
    .integer("create_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
  update_at: sqlite
    .integer("update_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
});

export const eventsRelations = relations(eventsTable, () => ({}));

export const accounts = sqlite.sqliteTable(
  "account",
  {
    userId: sqlite
      .text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: sqlite.text("type").$type<AdapterAccountType>().notNull(),
    provider: sqlite.text("provider").notNull(),
    providerAccountId: sqlite.text("providerAccountId").notNull(),
    refresh_token: sqlite.text("refresh_token"),
    access_token: sqlite.text("access_token"),
    expires_at: sqlite.integer("expires_at"),
    token_type: sqlite.text("token_type"),
    scope: sqlite.text("scope"),
    id_token: sqlite.text("id_token"),
    session_state: sqlite.text("session_state"),
  },
  (account) => [
    sqlite.primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = sqlite.sqliteTable("session", {
  sessionToken: sqlite.text("sessionToken").primaryKey(),
  userId: sqlite
    .text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: sqlite.integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = sqlite.sqliteTable(
  "verificationToken",
  {
    identifier: sqlite.text("identifier").notNull(),
    token: sqlite.text("token").notNull(),
    expires: sqlite.integer("expires", { mode: "timestamp_ms" }).notNull(),
  },
  (verificationToken) => [
    sqlite.primaryKey({
      columns: [verificationToken.identifier, verificationToken.token],
    }),
  ],
);

export const userMembershipPlansTable = sqlite.sqliteTable(
  "user_membership_plans",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    user_id: sqlite
      .text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plan_type: sqlite
      .text("plan_type", {
        enum: ["monthly", "monthly_cc", "yearly", "stored_value"],
      })
      .notNull(),
    amount: sqlite.int("amount"),
    note: sqlite.text("note"),
    start_date: sqlite
      .integer("start_date", { mode: "timestamp_ms" })
      .notNull(),
    end_date: sqlite.integer("end_date", { mode: "timestamp_ms" }), // 储值卡无到期时间
    create_at: sqlite
      .integer("create_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
    update_at: sqlite
      .integer("update_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
);

export const userMembershipPlansRelations = relations(
  userMembershipPlansTable,
  ({ one }) => ({
    user: one(users, {
      fields: [userMembershipPlansTable.user_id],
      references: [users.id],
    }),
  }),
);

export const tablesTable = sqlite.sqliteTable("tables", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  name: sqlite.text().notNull(),
  type: sqlite.text("type", { enum: ["mahjong", "boardgame"] }).notNull(),
  status: sqlite
    .text("status", { enum: ["active", "inactive"] })
    .notNull()
    .$default(() => "active"),
  capacity: sqlite.int().notNull(),
  description: sqlite.text(),
  code: sqlite.text().notNull(),
  create_at: sqlite
    .integer("create_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
  update_at: sqlite
    .integer("update_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
});

export const tableOccupancyTable = sqlite.sqliteTable("table_occupancy", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  table_id: sqlite
    .text("table_id")
    .notNull()
    .references(() => tablesTable.id, { onDelete: "cascade" }),
  user_id: sqlite
    .text("user_id")
    .references(() => users.id, { onDelete: "cascade" }),
  temp_id: sqlite.text("temp_id"),
  seats: sqlite
    .int()
    .notNull()
    .$default(() => 1),
  status: sqlite
    .text("status", { enum: ["active", "paused", "ended"] })
    .notNull()
    .$default(() => "active"),
  start_at: sqlite
    .integer("start_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date(Date.now())),
  end_at: sqlite.integer("end_at", { mode: "timestamp_ms" }),
  final_price: sqlite.int("final_price"),
  pricing_snapshot_id: sqlite.text("pricing_snapshot_id"),
  price_breakdown: sqlite.text("price_breakdown", { mode: "json" }).$type<{
    planName: string;
    planType: "fallback" | "conditional";
    billingType: "hourly" | "fixed";
    unitPrice: number;
    totalMinutes: number;
    billableHalfHours: number;
    rawPrice: number;
    capApplied: boolean;
    capType: string | null;
    finalPrice: number;
  }>(),
});

export const tablesRelations = relations(tablesTable, ({ many }) => ({
  occupancies: many(tableOccupancyTable),
}));

export const tableOccupancyRelations = relations(
  tableOccupancyTable,
  ({ one }) => ({
    table: one(tablesTable, {
      fields: [tableOccupancyTable.table_id],
      references: [tablesTable.id],
    }),
    user: one(users, {
      fields: [tableOccupancyTable.user_id],
      references: [users.id],
    }),
  }),
);

// ─── Temp Identities ────────────────────────────────────────────

export const tempIdentitiesTable = sqlite.sqliteTable("temp_identities", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  nickname: sqlite.text(),
  totp_secret: sqlite.text(),
  created_at: sqlite
    .integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
  expires_at: sqlite.integer("expires_at", { mode: "timestamp_ms" }),
});

// ─── Pricing Plans ──────────────────────────────────────────────

export const pricingSnapshotsTable = sqlite.sqliteTable("pricing_snapshots", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  name: sqlite
    .text("name")
    .notNull()
    .$default(() => "未命名"),
  data: sqlite.text("data", { mode: "json" }).$type<{
    config: {
      daytime_start: string;
      daytime_end: string;
    };
    plans: Array<{
      plan_type: "fallback" | "conditional";
      name: string;
      sort_order: number;
      enabled: boolean;
      conditions: unknown;
      billing_type: "hourly" | "fixed";
      price: number;
      cap_enabled: boolean;
      cap_unit: "per_day" | "split_day_night" | null;
      cap_price: number | null;
      cap_price_day: number | null;
      cap_price_night: number | null;
    }>;
  }>(),
  status: sqlite
    .text("status", { enum: ["draft", "published"] })
    .notNull()
    .$default(() => "draft"),
  created_at: sqlite
    .integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
  published_at: sqlite.integer("published_at", { mode: "timestamp_ms" }),
});

// ─── Authenticators ─────────────────────────────────────────────

export const authenticators = sqlite.sqliteTable(
  "authenticator",
  {
    credentialID: sqlite.text("credentialID").notNull().unique(),
    userId: sqlite
      .text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    providerAccountId: sqlite.text("providerAccountId").notNull(),
    credentialPublicKey: sqlite.text("credentialPublicKey").notNull(),
    counter: sqlite.integer("counter").notNull(),
    credentialDeviceType: sqlite.text("credentialDeviceType").notNull(),
    credentialBackedUp: sqlite
      .integer("credentialBackedUp", {
        mode: "boolean",
      })
      .notNull(),
    transports: sqlite.text("transports"),
  },
  (authenticator) => [
    sqlite.primaryKey({
      columns: [authenticator.userId, authenticator.credentialID],
    }),
  ],
);
