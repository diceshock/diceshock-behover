import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig, mergeConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import baseConfig from "../../vite.config.base";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import cmdWatch from "../../plugins/cmd-watch";

const config = defineConfig({
  plugins: [
    cmdWatch({
      watch: ["src/server/**/*.ts"],
      command: "pnpm exec gqty generate",
      cwd: __dirname,
      delay: 500, // 延迟 500 毫秒，等待 GraphQL 服务器重启
    }),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      routeTreeFileHeader: [
        "// biome-ignore-all lint: gen",
        "/* eslint-disable */",
        "// @ts-nocheck",
      ],
      autoCodeSplitting: true,
      routesDirectory: path.resolve(__dirname, "./src/apps/routers"),
      generatedRouteTree: path.resolve(
        __dirname,
        "./src/apps/routeTree.gen.ts"
      ),
    }),
    cloudflare({ configPath: path.resolve(__dirname, "./wrangler.toml") }),
    ssrPlugin({
      hotReload: {
        ignore: ["./src/client/**/*.tsx", "./src/apps/**/*.tsx"],
      },
    }),
    react(),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});

export default mergeConfig(config, baseConfig);
