import * as drizzle from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { docsContentZ, docsMetaZ } from "@/shared/types/table";
import { BoardGame } from "@/shared/types/BoardGame";
import z from "zod/v4";

export const docsTable = drizzle.sqliteTable("docs_table", {
  id: drizzle.text().$defaultFn(createId).primaryKey(),
  create_at: drizzle.integer("timestamp_ms").$defaultFn(() => Date.now()),
  meta: drizzle.blob({ mode: "json" }).$type<z.infer<typeof docsMetaZ>>(),
  content: drizzle.text({ mode: "json" }).$type<z.infer<typeof docsContentZ>>(),
});

export const boardGamesTable = drizzle.sqliteTable("board_games_table", {
  id: drizzle.text().$defaultFn(createId).primaryKey(),
  sch_name: drizzle.text(),
  eng_name: drizzle.text(),
  gstone_id: drizzle.int(),
  gstone_rating: drizzle.real(),
  category: drizzle.text({ mode: "json" }).$type<BoardGame["category"]>(),
  mode: drizzle.text({ mode: "json" }).$type<BoardGame["mode"]>(),
  player_num: drizzle.text({ mode: "json" }).$type<number[]>(),
  best_player_num: drizzle.text({ mode: "json" }).$type<number[]>(),
  content: drizzle.blob({ mode: "json" }).$type<BoardGame>(),
});

export const activesTable = drizzle.sqliteTable("actives_table", {
  id: drizzle.text().$defaultFn(createId).primaryKey(),
  name: drizzle.text(),
  is_published: drizzle.int({ mode: "boolean" }).$default(() => false),
  is_deleted: drizzle.int({ mode: "boolean" }).$default(() => false),
  description: drizzle.text(),
  publish_at: drizzle
    .integer({ mode: "timestamp_ms" })
    .$default(() => new Date(0)),
  content: drizzle.text(),
});

export const activeRelations = relations(activesTable, ({ many }) => ({
  tags: many(activeTagMappingsTable),
}));

export const activeTagsTable = drizzle.sqliteTable("active_tags_table", {
  id: drizzle.text().$defaultFn(createId),
  title: drizzle.text({ mode: "json" }).$type<{ tx: string; emoji: string }>(),
});

export const activeTagRelations = relations(activeTagsTable, ({ many }) => ({
  actives: many(activeTagMappingsTable),
}));

export const activeTagMappingsTable = drizzle.sqliteTable(
  "active_tag_mappings_table",
  {
    active_id: drizzle
      .text()
      .notNull()
      .references(() => activesTable.id),
    tag_id: drizzle
      .text()
      .notNull()
      .references(() => activeTagsTable.id),
  },
  (t) => [drizzle.primaryKey({ columns: [t.active_id, t.tag_id] })]
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
