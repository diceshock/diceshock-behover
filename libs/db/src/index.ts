export { BoardGame } from "@lib/utils";
export * as drizzle from "drizzle-orm";
export * from "./gstoneSchema";
export * as gstoneSchema from "./gstoneSchema";
export * from "./schema";
export * as schema from "./schema";
export * from "./types";

import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as gstoneSchema from "./gstoneSchema";
import * as schema from "./schema";

export default function db(d1: D1Database) {
  return drizzle(d1, { schema });
}

/** The Drizzle ORM instance returned by the default db factory. */
export type Database = ReturnType<typeof db>;

export function gstoneDb(d1: D1Database) {
  return drizzle(d1, { schema: gstoneSchema });
}
