import { cloudflare } from "@cloudflare/vite-plugin";
import { defineConfig } from "vite";
import ssrPlugin from "vite-ssr-components/plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import path from "node:path";

export default defineConfig({
    plugins: [
        svgr(),
        tailwindcss(),
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
            routesDirectory: "src/apps/diceshock/routers",
            generatedRouteTree: "src/apps/diceshock/routeTree.gen.ts",
        }),
        cloudflare(),
        ssrPlugin({
            hotReload: {
                ignore: ["./src/client/**/*.tsx", "./src/apps/**/*.tsx"],
            },
        }),
        react(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
