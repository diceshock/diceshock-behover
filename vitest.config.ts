import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/": `${path.resolve(__dirname, "apps/diceshock/src")}/`,
      "@lib/db": path.resolve(__dirname, "libs/db/src"),
      "@lib/utils": path.resolve(__dirname, "libs/utils/src"),
    },
  },
  test: {
    // Keep generated schemas and custom resolvers on the same GraphQL instance.
    server: { deps: { inline: ["drizzle-graphql"] } },
    include: [
      "apps/**/src/**/__tests__/**/*.test.{ts,tsx}",
      "apps/**/tests/**/*.test.{ts,tsx}",
      "libs/**/src/**/__tests__/**/*.test.{ts,tsx}",
    ],
    globals: true,
  },
});
