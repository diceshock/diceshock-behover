import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "weapp-vite/config";
import { loadMiniappConfig, type MiniappTarget } from "./scripts/config.ts";

const MAX_MAIN_PACKAGE_BYTES = 2 * 1024 * 1024;
// Raster media lives on R2; only this fixed brand mark ships in the package.
const BUNDLED_RASTER = "brand/jiedaokou.png";
const srcRoot = fileURLToPath(new URL("src", import.meta.url));

// Relative POSIX paths of every file under `root`.
function listFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((name) => statSync(path.join(root, name)).isFile())
    .map((name) => name.replaceAll("\\", "/"));
}

function assertNoStrayRaster() {
  for (const file of listFiles(srcRoot))
    if (/\.(png|jpe?g|gif|webp|avif)$/i.test(file) && file !== BUNDLED_RASTER)
      throw new Error(`Raster media must be hosted externally: src/${file}`);
}
const outDirs: Record<MiniappTarget, string> = {
  release: fileURLToPath(
    new URL("../../dist/miniapp-release", import.meta.url),
  ),
  local: fileURLToPath(
    new URL("../diceshock/.wrangler/miniapp-local", import.meta.url),
  ),
};

// `wv build` (production mode) is the uploadable release package; `wv dev`
// and `wv build --mode acceptance` target the local Worker and are never
// uploaded. (Vite reserves the mode name `local`.)
export default defineConfig(({ command, mode }) => {
  const target: MiniappTarget =
    command === "build" && mode === "production" ? "release" : "local";
  const { appId, apiOrigin, storeMedia } = loadMiniappConfig(target);
  assertNoStrayRaster();
  const outDir = outDirs[target];
  return {
    define: {
      __API_ORIGIN__: JSON.stringify(apiOrigin),
      __STORE_MEDIA__: JSON.stringify(storeMedia),
    },
    build: { outDir, emptyOutDir: true },
    plugins: [
      {
        name: "diceshock:package-size",
        apply: "build",
        // Static assets are copied outside the Rollup bundle, so measure disk.
        closeBundle() {
          const size = listFiles(outDir).reduce(
            (total, file) => total + statSync(path.join(outDir, file)).size,
            0,
          );
          if (size > MAX_MAIN_PACKAGE_BYTES)
            throw new Error(`Main package too large: ${size} bytes`);
        },
      },
    ],
    weapp: {
      srcRoot: "src",
      platform: "weapp",
      multiPlatform: {
        projectConfigs: {
          weapp: {
            appid: appId,
            projectname:
              target === "local"
                ? "骰子奇兵-原版设计-本地接口验收"
                : "骰子奇兵",
            compileType: "miniprogram",
            libVersion: "3.8.12",
            setting: { es6: true, urlCheck: target === "release" },
          },
        },
      },
      tailwindcss: {
        cssPreflight: false,
        rem2rpx: true,
        cssEntries: [fileURLToPath(new URL("src/app.css", import.meta.url))],
      },
    },
  };
});
