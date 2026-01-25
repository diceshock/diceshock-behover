import type { AdapterAccountType } from "@auth/core/adapters";
import type { BoardGame } from "@lib/utils";
import { createId } from "@paralleldrive/cuid2";
import { relations } from "drizzle-orm";
import * as sqlite from "drizzle-orm/sqlite-core";
import type z from "zod/v4";
import type { docsContentZ, docsMetaZ } from "./types/table";

export const docsTable = sqlite.sqliteTable("docs_table", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  create_at: sqlite.integer("timestamp_ms").$defaultFn(() => Date.now()),
  meta: sqlite.blob({ mode: "json" }).$type<z.infer<typeof docsMetaZ>>(),
  content: sqlite.text({ mode: "json" }).$type<z.infer<typeof docsContentZ>>(),
});

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

export const activesTable = sqlite.sqliteTable("actives_table", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  name: sqlite.text(),
  is_published: sqlite.int({ mode: "boolean" }).$default(() => false),
  is_deleted: sqlite.int({ mode: "boolean" }).$default(() => false),
  enable_registration: sqlite.int({ mode: "boolean" }).$default(() => false),
  allow_watching: sqlite.int({ mode: "boolean" }).$default(() => false),
  description: sqlite.text(),
  publish_at: sqlite
    .integer({ mode: "timestamp_ms" })
    .$default(() => new Date(0)),
  event_date: sqlite.integer({ mode: "timestamp_ms" }),
  content: sqlite.text(),
  cover_image: sqlite.text(),
  // 约局相关字段
  is_game: sqlite.int({ mode: "boolean" }).$default(() => false), // 是否是约局
  creator_id: sqlite.text(), // 约局发起者 ID
  max_participants: sqlite.integer(), // 约局人数上限（null 表示无上限）
});

export const activeTeamsTable = sqlite.sqliteTable("active_teams_table", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  active_id: sqlite
    .text()
    .notNull()
    .references(() => activesTable.id, { onDelete: "cascade" }),
  name: sqlite.text().notNull(),
  description: sqlite.text(),
  max_participants: sqlite.int(), // null 表示无上限
  create_at: sqlite
    .integer("create_at", { mode: "timestamp_ms" })
    .$defaultFn(() => new Date(Date.now())),
});

export const activeRegistrationsTable = sqlite.sqliteTable(
  "active_registrations_table",
  {
    id: sqlite.text().$defaultFn(createId).primaryKey(),
    active_id: sqlite
      .text()
      .notNull()
      .references(() => activesTable.id, { onDelete: "cascade" }),
    team_id: sqlite
      .text()
      .references(() => activeTeamsTable.id, { onDelete: "cascade" }),
    user_id: sqlite
      .text()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    is_watching: sqlite.int({ mode: "boolean" }).$default(() => false), // true 表示观望
    create_at: sqlite
      .integer("create_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
);

export const activeBoardGamesTable = sqlite.sqliteTable(
  "active_board_games_table",
  {
    active_id: sqlite
      .text()
      .notNull()
      .references(() => activesTable.id, { onDelete: "cascade" }),
    // 使用 gstone_id 而不是主键 id，因为迁移时主键会变
    board_game_id: sqlite
      .integer("board_game_id")
      .notNull(),
    create_at: sqlite
      .integer("create_at", { mode: "timestamp_ms" })
      .$defaultFn(() => new Date(Date.now())),
  },
  (t) => [sqlite.primaryKey({ columns: [t.active_id, t.board_game_id] })],
);

export const activeRelations = relations(activesTable, ({ many }) => ({
  tags: many(activeTagMappingsTable),
  teams: many(activeTeamsTable),
  registrations: many(activeRegistrationsTable),
  boardGames: many(activeBoardGamesTable),
}));

export const activeTeamsRelations = relations(
  activeTeamsTable,
  ({ one, many }) => ({
    active: one(activesTable, {
      fields: [activeTeamsTable.active_id],
      references: [activesTable.id],
    }),
    registrations: many(activeRegistrationsTable),
  }),
);

export const activeRegistrationsRelations = relations(
  activeRegistrationsTable,
  ({ one }) => ({
    active: one(activesTable, {
      fields: [activeRegistrationsTable.active_id],
      references: [activesTable.id],
    }),
    team: one(activeTeamsTable, {
      fields: [activeRegistrationsTable.team_id],
      references: [activeTeamsTable.id],
    }),
    user: one(users, {
      fields: [activeRegistrationsTable.user_id],
      references: [users.id],
    }),
  }),
);

export const activeTagsTable = sqlite.sqliteTable("active_tags_table", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  title: sqlite.text({ mode: "json" }).$type<{ tx: string; emoji: string }>(),
  keywords: sqlite.text(), // 用于辅助搜索的关键字，多个关键字用逗号分隔
  is_pinned: sqlite.int({ mode: "boolean" }).$default(() => false), // 是否置顶
  is_game_enabled: sqlite.int({ mode: "boolean" }).$default(() => false), // 是否启用约局
  order: sqlite.integer(), // 标签顺序，用于按添加顺序展示（可选字段）
});

export const activeTagRelations = relations(activeTagsTable, ({ many }) => ({
  actives: many(activeTagMappingsTable),
}));

export const activeTagMappingsTable = sqlite.sqliteTable(
  "active_tag_mappings_table",
  {
    active_id: sqlite
      .text()
      .notNull()
      .references(() => activesTable.id),
    tag_id: sqlite
      .text()
      .notNull()
      .references(() => activeTagsTable.id),
  },
  (t) => [sqlite.primaryKey({ columns: [t.active_id, t.tag_id] })],
);

export const activeTagMappingsRelations = relations(
  activeTagMappingsTable,
  ({ one }) => ({
    active: one(activesTable, {
      fields: [activeTagMappingsTable.active_id],
      references: [activesTable.id],
    }),
    tag: one(activeTagsTable, {
      fields: [activeTagMappingsTable.tag_id],
      references: [activeTagsTable.id],
    }),
  }),
);

export const activeBoardGamesRelations = relations(
  activeBoardGamesTable,
  ({ one }) => ({
    active: one(activesTable, {
      fields: [activeBoardGamesTable.active_id],
      references: [activesTable.id],
    }),
    boardGame: one(boardGamesTable, {
      fields: [activeBoardGamesTable.board_game_id],
      references: [boardGamesTable.id],
    }),
  }),
);

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

export const userBusinessCardTable = sqlite.sqliteTable(
  "user_business_card",
  {
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
  },
);

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

export const usersRelations = relations(users, ({ one }) => ({
  userInfo: one(userInfoTable, {
    fields: [users.id],
    references: [userInfoTable.id],
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
