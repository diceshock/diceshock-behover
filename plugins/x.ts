import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { RotatingLog } from "./log.ts";

const root = process.env.NX_WORKSPACE_ROOT ?? process.cwd();
const args = process.argv.slice(2);

interface RunOpts {
  name: string;
  cmd: string[];
  cwd: string;
  tag?: string;
}

const ESC = String.fromCharCode(0x1b);
const ANSI_RE = new RegExp(`${ESC}\\[[0-9;]*m`, "g");

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

/** Strip pnpm-injected npm_config_ env vars that npm 11 doesn't recognize. */
function cleanNpmEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const bad = ["npm_config__jsr-registry", "npm_config_npm-globalconfig", "npm_config_verify_deps_before_run"];
  for (const key of bad) delete env[key];
  // Also drop any npm_config_ keys with hyphens (pnpm-specific, not valid for npm 11)
  for (const key of Object.keys(env)) {
    if (key.startsWith("npm_config_") && key !== "npm_config_user_agent" && key.includes("-")) {
      delete env[key];
    }
  }
  return env;
}

function run(opts: RunOpts): ChildProcess {
  const log = new RotatingLog(opts.name, opts.cmd.join(" "));
  const tag = opts.tag ? `[${opts.tag}] ` : "";

  const child = spawn(opts.cmd[0], opts.cmd.slice(1), {
    cwd: opts.cwd,
    stdio: ["inherit", "pipe", "pipe"],
    env: cleanNpmEnv(),
  });

  child.stdout.on("data", (chunk: Buffer) => {
    const raw = chunk.toString();
    process.stdout.write(`${tag}${raw}`);
    log.write(stripAnsi(raw));
  });

  child.stderr.on("data", (chunk: Buffer) => {
    const raw = chunk.toString();
    process.stderr.write(`${tag}${raw}`);
    log.write(stripAnsi(raw));
  });

  child.on("close", (code) => {
    if (tag) console.log(`${tag}exited with code ${code}`);
    log.end();
  });

  return child;
}

function devMode() {
  const apps = [
    { name: "diceshock", cwd: resolve(root, "apps/diceshock") },
    { name: "runespark", cwd: resolve(root, "apps/runespark") },
  ];

  const children = apps.map((app) =>
    run({
      name: app.name,
      cmd: [resolve(root, "node_modules/.bin/vite"), "--host"],
      cwd: app.cwd,
      tag: app.name,
    }),
  );

  const cleanup = () => {
    for (const child of children) child.kill("SIGTERM");
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);
}

/** Map nx project names → app directories with wrangler.toml */
const appDirs: Record<string, string> = {
  diceshock: "apps/diceshock",
  rolesandbox: "apps/rolesandbox",
};

/** Targets that should run wrangler directly instead of nx */
const wranglerTargets = new Set(["preview", "deploy-preview", "deploy", "deploy:update"]);

function nxMode() {
  const target = args[0];
  if (!target) {
    console.error("usage: pnpm x <project:target> [args...]");
    process.exit(1);
  }

  const sep = target.indexOf(":");
  const project = sep > 0 ? target.slice(0, sep) : "";
  const task = sep > 0 ? target.slice(sep + 1) : target;
  const extra = args.slice(1);

  // Wrangler commands: run directly with --config pointing to the app
  if (project && wranglerTargets.has(task)) {
    const appDir = appDirs[project];
    if (!appDir) {
      console.error(`unknown project: ${project}`);
      process.exit(1);
    }

    // Deploy/upload: use Vite build output (dist/*/wrangler.json) which has
    // pre-bundled code. Running wrangler against source wrangler.toml fails
    // because wrangler's esbuild can't handle Vite-specific imports (?react, ?raw).
    if (task === "deploy" || task === "deploy:update") {
      const distDir = resolve(root, appDir, "dist");
      let buildConfig: string | undefined;
      if (existsSync(distDir)) {
        for (const entry of readdirSync(distDir)) {
          const candidate = join(distDir, entry, "wrangler.json");
          if (existsSync(candidate)) {
            buildConfig = candidate;
            break;
          }
        }
      }
      if (!buildConfig) {
        console.error(
          `No build output found at ${distDir}/*/wrangler.json\n` +
            `Run 'pnpm x ${project}:build' first.`,
        );
        process.exit(1);
      }
      const wranglerArgs =
        task === "deploy"
          ? ["deploy", "--config", buildConfig]
          : ["versions", "upload", "--config", buildConfig];
      const result = spawnSync(
        resolve(root, "node_modules/.bin/wrangler"),
        [...wranglerArgs, ...extra],
        { cwd: root, stdio: "inherit", env: cleanNpmEnv() },
      );
      process.exit(result.status ?? 1);
    }

    // Preview: use source wrangler.toml directly
    const configPath = resolve(root, appDir, "wrangler.toml");
    const wranglerArgs: string[] = [];
    if (task === "preview" || task === "deploy-preview") {
      wranglerArgs.push("preview", "--config", configPath);
    }
    const result = spawnSync(
      resolve(root, "node_modules/.bin/wrangler"),
      [...wranglerArgs, ...extra],
      { cwd: root, stdio: "inherit", env: cleanNpmEnv() },
    );
    process.exit(result.status ?? 1);
  }

  // Default: nx run
  const result = spawnSync(
    resolve(root, "node_modules/.bin/nx"),
    ["run", target, ...extra],
    { cwd: root, stdio: "inherit", env: cleanNpmEnv() },
  );
  process.exit(result.status ?? 1);
}

function cmdMode() {
  const cmd = args.slice(2);
  if (args.length < 3 || cmd.length === 0) {
    console.error("usage: pnpm x --run <name> <command...>");
    process.exit(1);
  }
  const result = spawnSync(cmd[0], cmd.slice(1), {
    cwd: root,
    stdio: "inherit",
    env: cleanNpmEnv(),
  });
  process.exit(result.status ?? 1);
}

if (args[0] === "--dev") {
  devMode();
} else if (args[0] === "--run") {
  cmdMode();
} else {
  nxMode();
}
