import * as drizzle from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { docsContentZ, docsMetaZ } from "@/shared/types/table";
import z from "zod/v4";
import { BoardGame } from "@/shared/types/BoardGame";

export const docsTable = drizzle.sqliteTable("docs_table", {
    id: drizzle.text().$defaultFn(() => createId()),
    create_at: drizzle.integer("timestamp_ms").$defaultFn(() => Date.now()),
    meta: drizzle.blob({ mode: "json" }).$type<z.infer<typeof docsMetaZ>>(),
    content: drizzle
        .text({ mode: "json" })
        .$type<z.infer<typeof docsContentZ>>(),
});

export const boardGamesTable = drizzle.sqliteTable("board_games_table", {
    id: drizzle.text().$defaultFn(() => createId()),
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

export const users = drizzle.sqliteTable("users", {
    id: drizzle.text("id").primaryKey(),
    name: drizzle.text("name"),
    email: drizzle.text("email").unique(),
    image: drizzle.text("image"),
    emailVerified: drizzle.integer("emailVerified", { mode: "timestamp_ms" }),
});
