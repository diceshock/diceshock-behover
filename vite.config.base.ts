import { defineConfig } from "vite";
import path from "node:path";

const baseConfig = defineConfig({
  resolve: { alias: { "@lib": path.resolve(__dirname, "./lib") } },
});

export default baseConfig;
