import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";
import { D1Database } from "@cloudflare/workers-types";

export * from "./schema";
export * as BoardGame from "./types/BoardGame";
export * from "./types/table";
export * from "./types";

export default function db(d1: D1Database) {
  return drizzle(d1, { schema });
}
