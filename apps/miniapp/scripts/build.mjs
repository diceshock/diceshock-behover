import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const local = process.argv.includes("--local");
const configPath = path.join(root, "config.local.json");
const config = existsSync(configPath)
  ? JSON.parse(readFileSync(configPath, "utf8").replace(/^\uFEFF/, ""))
  : {};
if (!local && !config.apiOrigin)
  throw new Error("请在 config.local.json 配置正式 apiOrigin 和 appId");
const origin = new URL(local ? "http://127.0.0.1:5173" : config.apiOrigin);
if (
  !local &&
  (origin.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "0.0.0.0", "example.com"].includes(
      origin.hostname,
    ) ||
    origin.hostname.endsWith(".test") ||
    origin.hostname.endsWith(".invalid"))
)
  throw new Error("正式构建需要真实 HTTPS API 域名");
if (
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash ||
  origin.username ||
  origin.password
)
  throw new Error("apiOrigin 必须是纯域名 origin");
if (!local && !/^wx[0-9a-f]{16}$/.test(config.appId || ""))
  throw new Error("正式构建需要配置真实微信 appId");
const media = config.storeMedia || {};
for (const value of Object.values(media))
  for (const key of ["image", "cover"])
    if (value[key] && new URL(value[key]).protocol !== "https:")
      throw new Error("门店图片必须使用 HTTPS");
const check = spawnSync(
  process.execPath,
  [path.join(root, "scripts/check.mjs")],
  { stdio: "inherit" },
);
if (check.status) process.exit(check.status);
// Each build gets an isolated directory; no stale demo files or embedded sessions.
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = path.resolve(
  root,
  local
    ? `../diceshock/.wrangler/miniapp-local/${stamp}`
    : `../../dist/miniapp-release/${stamp}`,
);
mkdirSync(output, { recursive: true });
for (const name of [
  "pages",
  "components",
  "services",
  "utils",
  "brand",
  "app.js",
  "app.json",
  "app.wxss",
])
  cpSync(path.join(root, name), path.join(output, name), { recursive: true });
const runtime = { apiOrigin: origin.origin, storeMedia: media };
writeFileSync(
  path.join(output, "config.js"),
  "module.exports = " + JSON.stringify(runtime, null, 2) + ";\n",
);
const project = JSON.parse(
  readFileSync(path.join(root, "project.config.json"), "utf8"),
);
project.appid = local ? "touristappid" : config.appId;
project.projectname = local ? "骰子奇兵-原版设计-本地接口验收" : "骰子奇兵";
project.setting = { ...project.setting, urlCheck: !local };
project.libVersion = "3.8.12";
writeFileSync(
  path.join(output, "project.config.json"),
  JSON.stringify(project, null, 2),
);
mkdirSync(path.resolve(root, "../diceshock/.wrangler"), { recursive: true });
writeFileSync(
  path.resolve(root, "../diceshock/.wrangler/last-miniapp-build.json"),
  JSON.stringify(
    { mode: local ? "local" : "release", output, origin: origin.origin },
    null,
    2,
  ),
);
console.log(
  `${local ? "本地接口验收包（不可上传）" : "正式发布包"}：${output}`,
);
