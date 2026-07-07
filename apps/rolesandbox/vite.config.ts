import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig, mergeConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import baseConfig from "../../vite.config.base";

const workspaceRoot = path.resolve(__dirname, "../..");

const config = defineConfig({
  plugins: [
    tailwindcss(),
    cloudflare({ configPath: path.resolve(__dirname, "./wrangler.toml") }),
  ],
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    fs: {
      allow: [workspaceRoot],
    },
  },
});

export default mergeConfig(config, baseConfig);
