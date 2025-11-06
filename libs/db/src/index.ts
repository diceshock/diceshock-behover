import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export * from "./schema";
export * from "./types";
export * as BoardGame from "./types/BoardGame";
export * from "./types/table";

export default function db(d1: D1Database) {
  return drizzle(d1, { schema });
}
