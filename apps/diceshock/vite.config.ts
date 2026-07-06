import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig, mergeConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import baseConfig from "../../vite.config.base";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "node:path";

// Rolldown emits `__require("assert")` etc. for CJS deps in Workers ESM.
// nodejs_compat_v2 makes `node:module` createRequire available — inject a
// global `require` shim so CJS wrappers resolve Node builtins correctly.
function workerRequireShim() {
  return {
    name: "worker-require-shim",
    renderChunk(code: string) {
      if (!code.includes("__require")) return null;
      const shim = `import{createRequire as __cr}from"node:module";var require=__cr("file:///worker.mjs");\n`;
      return { code: shim + code, map: null };
    },
  };
}

const config = defineConfig({
  plugins: [
    svgr(),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      routeTreeFileHeader: [
        "// biome-ignore-all lint: gen",
        "/* eslint-disable */",
        "// @ts-nocheck",
      ],
      autoCodeSplitting: true,
      routeFileIgnorePattern: ".*/__tests__/.*",
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
    workerRequireShim(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      qrcode: "qrcode/lib/browser.js",
    },
  },
});

export default mergeConfig(config, baseConfig);
