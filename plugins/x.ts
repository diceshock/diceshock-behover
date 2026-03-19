import { type ChildProcess, spawn } from "node:child_process";
import { resolve } from "node:path";
import { agentsDir, RotatingLog } from "./log.js";

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

function run(opts: RunOpts): ChildProcess {
  const log = new RotatingLog(opts.name, opts.cmd.join(" "));
  const tag = opts.tag ? `[${opts.tag}] ` : "";

  const child = spawn(opts.cmd[0], opts.cmd.slice(1), {
    cwd: opts.cwd,
    stdio: ["inherit", "pipe", "pipe"],
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
      cmd: ["npx", "vite", "--host"],
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

function nxMode() {
  const target = args[0];
  if (!target) {
    console.error("usage: pnpm x <project:target> [args...]");
    process.exit(1);
  }
  const name = target.replace(/:/g, "-");
  const extra = args.slice(1);

  const child = run({
    name,
    cmd: ["npx", "nx", "run", target, ...extra],
    cwd: root,
  });

  child.on("close", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

function cmdMode() {
  const name = args[1];
  const cmd = args.slice(2);
  if (!name || cmd.length === 0) {
    console.error("usage: pnpm x --run <name> <command...>");
    process.exit(1);
  }

  const child = run({ name, cmd, cwd: root });

  child.on("close", (code) => process.exit(code ?? 0));
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));
}

if (args[0] === "--dev") {
  devMode();
} else if (args[0] === "--run") {
  cmdMode();
} else {
  nxMode();
}
