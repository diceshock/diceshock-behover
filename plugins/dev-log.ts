import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { agentsDir, RotatingLog } from "./log.js";

const root = process.env.NX_WORKSPACE_ROOT ?? process.cwd();

interface App {
  name: string;
  cwd: string;
}

const apps: App[] = [
  { name: "diceshock", cwd: resolve(root, "apps/diceshock") },
  { name: "runespark", cwd: resolve(root, "apps/runespark") },
];

function runApp(app: App) {
  const cmdLine = `vite --host (${app.cwd})`;
  const log = new RotatingLog(app.name, cmdLine);
  const tag = `[${app.name}]`;

  const child = spawn("npx", ["vite", "--host"], {
    cwd: app.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });

  child.stdout.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    process.stdout.write(`${tag} ${text}`);
    log.write(text);
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    process.stderr.write(`${tag} ${text}`);
    log.write(text);
  });

  child.on("close", (code) => {
    console.log(`${tag} exited with code ${code}`);
    log.end();
  });

  return child;
}

console.log(`[dev] logs → ${agentsDir}/`);

const children = apps.map((app) => {
  console.log(`[dev] starting ${app.name}...`);
  return runApp(app);
});

function cleanup() {
  console.log("\n[dev] shutting down...");
  for (const child of children) {
    child.kill("SIGTERM");
  }
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
