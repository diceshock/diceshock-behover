import type { AdapterAccountType } from "@auth/core/adapters";
import type { BoardGame } from "@lib/utils";
import { relations } from "drizzle-orm";
import * as sqlite from "drizzle-orm/sqlite-core";

const createId = () => crypto.randomUUID();

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

export const storesTable = sqlite.sqliteTable("stores", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  code: sqlite.text().unique(),
  name: sqlite.text().notNull(),
  address: sqlite.text(),
  is_active: sqlite.integer().default(1),
  created_at: sqlite
    .integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
});

export const storeInventoryTable = sqlite.sqliteTable(
  "store_inventory",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    store_id: sqlite.text().references(() => storesTable.id),
    board_game_id: sqlite.text().references(() => boardGamesTable.id),
    quantity: sqlite.integer().default(0),
    status: sqlite
      .text("status", { enum: ["available", "unavailable", "damaged"] })
      .default("available"),
    notes: sqlite.text(),
    created_at: sqlite
      .integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (table) => [
    sqlite.index("idx_store_inventory_store_id").on(table.store_id),
    sqlite.index("idx_store_inventory_board_game_id").on(table.board_game_id),
  ],
);

export const storeInventoryRelations = relations(
  storeInventoryTable,
  ({ one }) => ({
    store: one(storesTable, {
      fields: [storeInventoryTable.store_id],
      references: [storesTable.id],
    }),
    boardGame: one(boardGamesTable, {
      fields: [storeInventoryTable.board_game_id],
      references: [boardGamesTable.id],
    }),
  }),
);

export const userRoles = ["customer", "admin", "staff"] as const;
export type UserRole = (typeof userRoles)[number];

export const users = sqlite.sqliteTable("user", {
  id: sqlite
    .text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: sqlite.text("name"),
  email: sqlite.text("email").unique(),
  emailVerified: sqlite.integer("emailVerified", { mode: "timestamp_ms" }),
  image: sqlite.text("image"),
  role: sqlite.text("role", { enum: userRoles }).notNull().default("customer"),
  disabled: sqlite.integer("disabled", { mode: "boolean" }).notNull().default(false),
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
  points: sqlite.int("points").$default(() => 0),
  avatar_url: sqlite.text("avatar_url"),
  meta: sqlite
    .text("meta", { mode: "json" })
    .$type<{ auto_nickname?: boolean } | null>(),
  preferred_store_id: sqlite
    .text("preferred_store_id")
    .references(() => storesTable.id),
  preferred_locale: sqlite.text("preferred_locale"),
  preferred_theme: sqlite.text("preferred_theme"),
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
  preferredStore: one(storesTable, {
    fields: [userInfoTable.preferred_store_id],
    references: [storesTable.id],
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

export const activesTable = sqlite.sqliteTable(
  "actives",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    creator_id: sqlite
      .text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: sqlite.text().notNull(),
    board_game_id: sqlite
      .text("board_game_id")
      .references(() => boardGamesTable.id),
    store_id: sqlite.text("store_id").references(() => storesTable.id),
    date: sqlite.text().notNull(), // "YYYY-MM-DD"
    time: sqlite.text(), // "HH:mm"
    max_players: sqlite.int().notNull(),
    content: sqlite.text(), // tiptap JSON
    is_game: sqlite.int({ mode: "boolean" }).$default(() => true),
    is_system_recommended: sqlite
      .integer("is_system_recommended", { mode: "boolean" })
      .$default(() => false),
    create_at: sqlite
      .integer("create_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
    update_at: sqlite
      .integer("update_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (table) => [sqlite.index("idx_actives_store_id").on(table.store_id)],
);

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
  store: one(storesTable, {
    fields: [activesTable.store_id],
    references: [storesTable.id],
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

export const eventsTable = sqlite.sqliteTable(
  "events",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    title: sqlite.text().notNull(),
    description: sqlite.text(),
    cover_image_url: sqlite.text(),
    content: sqlite.text(),
    store_id: sqlite.text("store_id").references(() => storesTable.id),
    is_published: sqlite.int({ mode: "boolean" }).$default(() => false),
    create_at: sqlite
      .integer("create_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
    update_at: sqlite
      .integer("update_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (table) => [sqlite.index("idx_events_store_id").on(table.store_id)],
);

export const eventsRelations = relations(eventsTable, ({ one }) => ({
  store: one(storesTable, {
    fields: [eventsTable.store_id],
    references: [storesTable.id],
  }),
}));

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
    amount: sqlite.int("amount"), // 储值变动(分)
    points: sqlite.int("points"), // 积分变动
    note: sqlite.text("note"),
    order_id: sqlite.text("order_id"),
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

export const tablesTable = sqlite.sqliteTable(
  "tables",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    name: sqlite.text().notNull(),
    type: sqlite.text("type", { enum: ["fixed", "solo"] }).notNull(),
    scope: sqlite
      .text("scope", { enum: ["trpg", "boardgame", "console", "mahjong"] })
      .notNull()
      .$default(() => "boardgame"),
    status: sqlite
      .text("status", { enum: ["active", "inactive"] })
      .notNull()
      .$default(() => "active"),
    capacity: sqlite.int().notNull(),
    description: sqlite.text(),
    code: sqlite.text().notNull(),
    store_id: sqlite.text("store_id").references(() => storesTable.id),
    create_at: sqlite
      .integer("create_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
    update_at: sqlite
      .integer("update_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (table) => [sqlite.index("idx_tables_store_id").on(table.store_id)],
);

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
    .text("status", { enum: ["active", "paused", "ended", "settled"] })
    .notNull()
    .$default(() => "active"),
  start_at: sqlite
    .integer("start_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date(Date.now())),
  end_at: sqlite.integer("end_at", { mode: "timestamp_ms" }),
  settled_at: sqlite.integer("settled_at", { mode: "timestamp_ms" }),
  pricing_snapshot_id: sqlite.text("pricing_snapshot_id"),
  final_price: sqlite.int("final_price"),
  final_points: sqlite.int("final_points"),
  settled_price: sqlite.int("settled_price"),
  settled_points: sqlite.int("settled_points"),
  note: sqlite.text("note"),
});

export const orderPauseLogsTable = sqlite.sqliteTable("order_pause_logs", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  occupancy_id: sqlite
    .text("occupancy_id")
    .notNull()
    .references(() => tableOccupancyTable.id, { onDelete: "cascade" }),
  paused_at: sqlite
    .integer("paused_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date(Date.now())),
  resumed_at: sqlite.integer("resumed_at", { mode: "timestamp_ms" }),
  pause_reason: sqlite
    .text("pause_reason", {
      enum: ["manual", "settlement", "auto_transfer"],
    })
    .default("manual"),
});

export const tablesRelations = relations(tablesTable, ({ one, many }) => ({
  store: one(storesTable, {
    fields: [tablesTable.store_id],
    references: [storesTable.id],
  }),
  occupancies: many(tableOccupancyTable),
}));

export const tableOccupancyRelations = relations(
  tableOccupancyTable,
  ({ one, many }) => ({
    table: one(tablesTable, {
      fields: [tableOccupancyTable.table_id],
      references: [tablesTable.id],
    }),
    user: one(users, {
      fields: [tableOccupancyTable.user_id],
      references: [users.id],
    }),
    pauseLogs: many(orderPauseLogsTable),
  }),
);

export const orderPauseLogsRelations = relations(
  orderPauseLogsTable,
  ({ one }) => ({
    occupancy: one(tableOccupancyTable, {
      fields: [orderPauseLogsTable.occupancy_id],
      references: [tableOccupancyTable.id],
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
});

export const wechatConversationRoles = ["user", "assistant", "tool"] as const;
export type WechatConversationRole = (typeof wechatConversationRoles)[number];

export const wechatConversationsTable = sqlite.sqliteTable(
  "wechat_conversations",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    open_id: sqlite.text("open_id").notNull(),
    role: sqlite
      .text("role", { enum: wechatConversationRoles })
      .$type<WechatConversationRole>()
      .notNull(),
    content: sqlite.text("content").notNull(),
    metadata: sqlite.text("metadata"),
    created_at: sqlite
      .integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    sqlite.index("idx_wechat_conversations_open_id").on(table.open_id),
    sqlite.index("idx_wechat_conversations_created_at").on(table.created_at),
  ],
);

export const chatSessionRoles = ["user", "assistant", "tool"] as const;
export type ChatSessionRole = (typeof chatSessionRoles)[number];

export const chatSessionsTable = sqlite.sqliteTable(
  "chat_sessions",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    user_id: sqlite.text("user_id").notNull(),
    title: sqlite.text("title").notNull().default("新对话"),
    created_at: sqlite
      .integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
    updated_at: sqlite
      .integer("updated_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    sqlite.index("idx_chat_sessions_user_id").on(table.user_id),
    sqlite.index("idx_chat_sessions_updated_at").on(table.updated_at),
  ],
);

export const chatMessagesTable = sqlite.sqliteTable(
  "chat_messages",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    session_id: sqlite.text("session_id").notNull(),
    role: sqlite
      .text("role", { enum: chatSessionRoles })
      .$type<ChatSessionRole>()
      .notNull(),
    content: sqlite.text("content").notNull(),
    tool_invocations: sqlite.text("tool_invocations"),
    created_at: sqlite
      .integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    sqlite.index("idx_chat_messages_session_id").on(table.session_id),
  ],
);

// ─── Pricing Plans ──────────────────────────────────────────────

export const pricingSnapshotsTable = sqlite.sqliteTable(
  "pricing_snapshots",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    name: sqlite
      .text("name")
      .notNull()
      .$default(() => "未命名"),
    store_id: sqlite.text("store_id").references(() => storesTable.id),
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
        points: number;
        cap_enabled: boolean;
        cap_unit: "per_day" | "split_day_night" | null;
        cap_price: number | null;
        cap_price_day: number | null;
        cap_price_night: number | null;
        cap_points: number | null;
        cap_points_day: number | null;
        cap_points_night: number | null;
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
  },
  (table) => [
    sqlite.index("idx_pricing_snapshots_store_id").on(table.store_id),
  ],
);

export const pricingSnapshotsRelations = relations(
  pricingSnapshotsTable,
  ({ one }) => ({
    store: one(storesTable, {
      fields: [pricingSnapshotsTable.store_id],
      references: [storesTable.id],
    }),
  }),
);

// ─── WeChat Menu Snapshots ──────────────────────────────────────

export type WechatMenuItemType = "view" | "click" | "miniprogram";

export interface WechatMenuItem {
  id: string;
  type: WechatMenuItemType;
  name: string;
  /** For type=view: URL to open */
  url?: string;
  /** For type=click: event key */
  key?: string;
  /** For type=view with special routes: "home" | "custom" | route path */
  link_target?: string;
  /** Notification message (for click type with notification) */
  notification?: {
    message: string;
    translations: Record<string, string>;
  };
}

export interface WechatMenuCategory {
  id: string;
  name: string;
  items: WechatMenuItem[];
}

export type WechatMenuButton = WechatMenuItem | WechatMenuCategory;

export interface WechatMenuData {
  buttons: WechatMenuButton[];
}

export const wechatMenuSnapshotsTable = sqlite.sqliteTable(
  "wechat_menu_snapshots",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    name: sqlite
      .text("name")
      .notNull()
      .$default(() => "未命名菜单"),
    store_id: sqlite.text("store_id").references(() => storesTable.id),
    data: sqlite.text("data", { mode: "json" }).$type<WechatMenuData>(),
    status: sqlite
      .text("status", { enum: ["draft", "published"] })
      .notNull()
      .$default(() => "draft"),
    created_at: sqlite
      .integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
    published_at: sqlite.integer("published_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    sqlite.index("idx_wechat_menu_snapshots_store_id").on(table.store_id),
  ],
);

export const wechatMenuSnapshotsRelations = relations(
  wechatMenuSnapshotsTable,
  ({ one }) => ({
    store: one(storesTable, {
      fields: [wechatMenuSnapshotsTable.store_id],
      references: [storesTable.id],
    }),
  }),
);

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

export const mahjongMatchesTable = sqlite.sqliteTable(
  "mahjong_matches",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    table_id: sqlite.text().references(() => tablesTable.id),
    store_id: sqlite.text("store_id").references(() => storesTable.id),
    match_type: sqlite.text().$type<"store" | "tournament">(),
    gsz_record_id: sqlite.integer("gsz_record_id"),
    mode: sqlite.text().$type<"3p" | "4p">().notNull(),
    format: sqlite.text().$type<"tonpuu" | "hanchan">().notNull(),
    started_at: sqlite.integer({ mode: "timestamp_ms" }).notNull(),
    ended_at: sqlite.integer({ mode: "timestamp_ms" }).notNull(),
    termination_reason: sqlite
      .text()
      .$type<"score_complete" | "vote" | "admin_abort" | "order_invalid">()
      .notNull(),
    players: sqlite.text({ mode: "json" }).$type<
      Array<{
        userId: string;
        nickname: string;
        seat: string | null;
        finalScore: number;
      }>
    >(),
    round_history: sqlite.text({ mode: "json" }).$type<
      Array<{
        round: number;
        wind: string;
        honba: number;
        dealerUserId: string;
        scores: Record<string, number>;
        result: string;
      }>
    >(),
    config: sqlite.text({ mode: "json" }).$type<{
      type?: string;
      mode: string;
      format: string;
    }>(),
    gsz_synced: sqlite
      .integer("gsz_synced", { mode: "boolean" })
      .notNull()
      .default(false),
    gsz_error: sqlite.text("gsz_error"),
    gsz_synced_at: sqlite.integer("gsz_synced_at", { mode: "timestamp_ms" }),
    created_at: sqlite
      .integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (table) => [sqlite.index("idx_mahjong_matches_store_id").on(table.store_id)],
);

export const mahjongMatchesRelations = relations(
  mahjongMatchesTable,
  ({ one }) => ({
    table: one(tablesTable, {
      fields: [mahjongMatchesTable.table_id],
      references: [tablesTable.id],
    }),
    store: one(storesTable, {
      fields: [mahjongMatchesTable.store_id],
      references: [storesTable.id],
    }),
  }),
);

export const mahjongRegistrationsTable = sqlite.sqliteTable(
  "mahjong_registrations",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    user_id: sqlite
      .text()
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    phone: sqlite.text().notNull(),
    gsz_id: sqlite.integer("gsz_id"),
    gsz_name: sqlite.text("gsz_name"),
    gsz_synced: sqlite
      .integer("gsz_synced", { mode: "boolean" })
      .notNull()
      .default(false),
    gsz_error: sqlite.text("gsz_error"),
    gsz_synced_at: sqlite.integer("gsz_synced_at", { mode: "timestamp_ms" }),
    registered_at: sqlite
      .integer("registered_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
);

// ─── Leaderboard ───────────────────────────────────────────────

export const leaderboardSnapshotsTable = sqlite.sqliteTable(
  "leaderboard_snapshots",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    store_id: sqlite.text("store_id").references(() => storesTable.id),
    category: sqlite
      .text()
      .$type<
        | "tournament"
        | "store_4p_hanchan"
        | "store_4p_tonpuu"
        | "store_3p_hanchan"
        | "store_3p_tonpuu"
      >()
      .notNull(),
    period: sqlite.text().$type<"day" | "week" | "month">().notNull(),
    snapshot_date: sqlite.text("snapshot_date").notNull(),
    data: sqlite.text({ mode: "json" }).$type<
      Array<{
        userId: string;
        nickname: string;
        totalPP: number;
        matchCount: number;
        rank: number;
        prevRank: number | null;
      }>
    >(),
    computed_at: sqlite.integer("computed_at", { mode: "timestamp_ms" }),
    created_at: sqlite
      .integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (table) => [
    sqlite.index("idx_leaderboard_snapshots_store_id").on(table.store_id),
  ],
);

export const leaderboardSnapshotsRelations = relations(
  leaderboardSnapshotsTable,
  ({ one }) => ({
    store: one(storesTable, {
      fields: [leaderboardSnapshotsTable.store_id],
      references: [storesTable.id],
    }),
  }),
);

export const userBadgesTable = sqlite.sqliteTable("user_badges", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  user_id: sqlite
    .text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  badge_type: sqlite
    .text("badge_type")
    .$type<"daily_top3" | "monthly_top3" | "yearly_top10">()
    .notNull(),
  badge_rank: sqlite.integer("badge_rank").notNull(),
  category: sqlite
    .text("category")
    .$type<
      | "tournament"
      | "store_4p_hanchan"
      | "store_4p_tonpuu"
      | "store_3p_hanchan"
      | "store_3p_tonpuu"
    >()
    .notNull(),
  period_label: sqlite.text("period_label").notNull(),
  title: sqlite.text("title").notNull(),
  awarded_at: sqlite.integer("awarded_at", { mode: "timestamp_ms" }).notNull(),
  created_at: sqlite
    .integer("created_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
});

// ─── User Preferences ───────────────────────────────────────────

export const userPreferencesTable = sqlite.sqliteTable(
  "user_preferences",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    user_id: sqlite
      .text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    raw_text: sqlite.text("raw_text").notNull(),
    rrule: sqlite.text("rrule").notNull(),
    categories: sqlite
      .text("categories", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$default(() => []),
    player_count: sqlite.integer("player_count"),
    enabled: sqlite
      .integer("enabled", { mode: "boolean" })
      .notNull()
      .$default(() => true),
    created_at: sqlite
      .integer("created_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
    updated_at: sqlite
      .integer("updated_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (table) => [sqlite.index("idx_user_preferences_user_id").on(table.user_id)],
);

export const preferencePushLogTable = sqlite.sqliteTable(
  "preference_push_log",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    user_id: sqlite
      .text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    preference_id: sqlite
      .text("preference_id")
      .references(() => userPreferencesTable.id, { onDelete: "set null" }),
    active_id: sqlite
      .text("active_id")
      .references(() => activesTable.id, { onDelete: "set null" }),
    push_type: sqlite
      .text("push_type", { enum: ["preference_match", "active_match"] })
      .notNull(),
    push_date: sqlite.text("push_date").notNull(), // "YYYY-MM-DD"
    sent_at: sqlite
      .integer("sent_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date(Date.now())),
    message_summary: sqlite.text("message_summary"),
  },
  (table) => [
    sqlite.index("idx_push_log_user_date").on(table.user_id, table.push_date),
  ],
);

export const userPreferencesRelations = relations(
  userPreferencesTable,
  ({ one }) => ({
    user: one(users, {
      fields: [userPreferencesTable.user_id],
      references: [users.id],
    }),
  }),
);

export const preferencePushLogRelations = relations(
  preferencePushLogTable,
  ({ one }) => ({
    user: one(users, {
      fields: [preferencePushLogTable.user_id],
      references: [users.id],
    }),
    preference: one(userPreferencesTable, {
      fields: [preferencePushLogTable.preference_id],
      references: [userPreferencesTable.id],
    }),
    active: one(activesTable, {
      fields: [preferencePushLogTable.active_id],
      references: [activesTable.id],
    }),
  }),
);

export const storesRelations = relations(storesTable, ({ many }) => ({
  inventory: many(storeInventoryTable),
  tables: many(tablesTable),
  pricingSnapshots: many(pricingSnapshotsTable),
  wechatMenuSnapshots: many(wechatMenuSnapshotsTable),
  events: many(eventsTable),
  actives: many(activesTable),
  mahjongMatches: many(mahjongMatchesTable),
  leaderboardSnapshots: many(leaderboardSnapshotsTable),
  preferredByUsers: many(userInfoTable),
}));

// ─── Dash Search History (per-user, staff only) ─────────────────

export const dashSearchHistoryTable = sqlite.sqliteTable(
  "dash_search_history",
  {
    id: sqlite.text("id").primaryKey().$defaultFn(createId),
    user_id: sqlite.text("user_id").notNull(),
    label: sqlite.text("label").notNull(),
    category_id: sqlite.text("category_id").notNull(),
    route: sqlite.text("route").notNull(),
    params: sqlite.text("params").notNull().default("{}"),
    created_at: sqlite
      .integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (table) => [
    sqlite.index("idx_dash_search_history_user_id").on(table.user_id),
  ],
);

export const dashSearchHistoryRelations = relations(
  dashSearchHistoryTable,
  ({ one }) => ({
    user: one(users, {
      fields: [dashSearchHistoryTable.user_id],
      references: [users.id],
    }),
  }),
);
