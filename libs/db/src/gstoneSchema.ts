import * as sqlite from "drizzle-orm/sqlite-core";

export const gstoneGamesTable = sqlite.sqliteTable(
  "games",
  {
    gstone_id: sqlite.integer("gstone_id").primaryKey(),
    name: sqlite.text("name"),
    eng_name: sqlite.text("eng_name"),
    rating: sqlite.real("rating"),
    player_num: sqlite.text("player_num", { mode: "json" }).$type<number[]>(),
    category: sqlite
      .text("category", { mode: "json" })
      .$type<Array<{ id: number; value: string }>>(),
    description: sqlite.text("description"),
    cover_url: sqlite.text("cover_url"),
    r2_cover_url: sqlite.text("r2_cover_url"),
    full_data: sqlite.text("full_data", { mode: "json" }).$type<unknown>(),
    error: sqlite.text("error"),
    retry_count: sqlite.integer("retry_count").notNull().default(0),
    created_at: sqlite.text("created_at").notNull(),
    crawled_at: sqlite.text("crawled_at"),
    updated_at: sqlite.text("updated_at").notNull(),
  },
  (table) => [
    sqlite.index("idx_games_crawled").on(table.crawled_at),
    sqlite.index("idx_games_error").on(table.error),
  ],
);

export const gstoneDocumentsTable = sqlite.sqliteTable(
  "documents",
  {
    document_id: sqlite.integer("document_id").primaryKey(),
    game_id: sqlite.integer("game_id").notNull(),
    title: sqlite.text("title"),
    page_count: sqlite.integer("page_count"),
    image_urls: sqlite.text("image_urls", { mode: "json" }).$type<string[]>(),
    r2_key: sqlite.text("r2_key"),
    ocr_pages: sqlite.text("ocr_pages", { mode: "json" }).$type<string[]>(),
    error: sqlite.text("error"),
    retry_count: sqlite.integer("retry_count").notNull().default(0),
    created_at: sqlite.text("created_at").notNull(),
    crawled_at: sqlite.text("crawled_at"),
    ocr_at: sqlite.text("ocr_at"),
    updated_at: sqlite.text("updated_at").notNull(),
  },
  (table) => [
    sqlite.index("idx_docs_game").on(table.game_id),
    sqlite.index("idx_docs_crawled").on(table.crawled_at),
    sqlite.index("idx_docs_ocr").on(table.ocr_at),
  ],
);
