// Workers Builds runs `npx wrangler preview` from the repository root, while
// the Vite build writes the resolved config under apps/diceshock/dist. Copy it
// to the root with repo-relative main/assets paths so preview can find it.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const generated = "apps/diceshock/dist/diceshock_behover/wrangler.json";
if (!existsSync(generated)) {
  console.error(`[prepare-preview-config] missing ${generated}; run the build first`);
  process.exit(1);
}

const config = JSON.parse(readFileSync(generated, "utf8"));
delete config.configPath;
delete config.userConfigPath;
config.main = "apps/diceshock/dist/diceshock_behover/index.js";
config.assets = {
  ...(config.assets ?? {}),
  directory: "apps/diceshock/dist/client",
};

writeFileSync("wrangler.json", JSON.stringify(config, null, 2) + "\n");
console.log("[prepare-preview-config] wrote wrangler.json");
