export * from "./types/table";
export { BoardGame } from "@lib/utils";
export * from "./schema";
export * from "./types";

import * as schema from "./schema";
import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";


export default function db(d1: D1Database) {
  return drizzle(d1, { schema });
}
