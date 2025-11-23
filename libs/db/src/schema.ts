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
  (t) => [sqlite.primaryKey({ columns: [t.active_id, t.tag_id] })]
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
  })
);
