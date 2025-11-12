import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: ".../../drizzle",
  schema: "../../libs/db/src/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: "" },
});
