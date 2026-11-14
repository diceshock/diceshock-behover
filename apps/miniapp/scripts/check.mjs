import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
let size = 0;
let files = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (
      [
        "scripts",
        "node_modules",
        "config.local.json",
        "project.private.config.json",
      ].includes(name)
    )
      continue;
    const file = path.join(dir, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      walk(file);
      continue;
    }
    if (/\.(png|jpe?g|gif|webp|avif)$/i.test(name))
      throw new Error(`Raster media must be hosted externally: ${file}`);
    if (name.endsWith(".js")) {
      const result = spawnSync(process.execPath, ["--check", file], {
        encoding: "utf8",
      });
      if (result.status !== 0) throw new Error(result.stderr);
    }
    if (name.endsWith(".json"))
      JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
    size += stat.size;
    files++;
  }
}
walk(root);
const app = JSON.parse(
  readFileSync(path.join(root, "app.json"), "utf8").replace(/^\uFEFF/, ""),
);
for (const page of app.pages)
  for (const ext of [".js", ".json", ".wxml"])
    statSync(path.join(root, page + ext));
if (size > 2 * 1024 * 1024)
  throw new Error(`Main package too large: ${size} bytes`);
console.log(
  `Miniapp source check passed: ${files} files, ${size} bytes, no raster assets.`,
);
