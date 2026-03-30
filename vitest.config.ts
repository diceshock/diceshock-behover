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
    include: ["apps/**/src/**/__tests__/**/*.test.ts"],
    globals: true,
  },
});
