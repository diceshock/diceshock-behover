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
  description: sqlite.text(),
  publish_at: sqlite
    .integer({ mode: "timestamp_ms" })
    .$default(() => new Date(0)),
  content: sqlite.text(),
  cover_image: sqlite.text(),
});

export const activeRelations = relations(activesTable, ({ many }) => ({
  tags: many(activeTagMappingsTable),
}));

export const activeTagsTable = sqlite.sqliteTable("active_tags_table", {
  id: sqlite.text().$defaultFn(createId).primaryKey(),
  title: sqlite.text({ mode: "json" }).$type<{ tx: string; emoji: string }>(),
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
