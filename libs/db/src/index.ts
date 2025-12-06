export { BoardGame } from "@lib/utils";
export * as drizzle from "drizzle-orm";
export * from "./schema";
export * as schema from "./schema";
export * from "./types";
export * from "./types/table";

import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export default function db(d1: D1Database) {
  return drizzle(d1, { schema });
}
