import { cloudflare } from "@cloudflare/vite-plugin";
import baseConfig from "../../vite.config.base";
import { defineConfig, mergeConfig } from "vite";
import path from "node:path";

const config = defineConfig({
  plugins: [
    cloudflare({ configPath: path.resolve(__dirname, "./wrangler.toml") }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});

export default mergeConfig(config, baseConfig);
