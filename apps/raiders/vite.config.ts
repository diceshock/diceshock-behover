import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  plugins: [
    cloudflare({ configPath: path.resolve(__dirname, "./wrangler.toml") }),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
