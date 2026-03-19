import { spawn } from "node:child_process";
import { agentsDir, RotatingLog } from "./log.js";

// usage: tsx plugins/run-log.ts <name> <command...>
//    or: tsx plugins/run-log.ts --nx <nx-target> [extra args...]
//
// --nx mode: parses "project:target" into log name, runs `npx nx run <target> ...`

const rawArgs = process.argv.slice(2);

if (rawArgs.length === 0) {
  console.error("usage: tsx plugins/run-log.ts <name> <command...>");
  console.error(
    "       tsx plugins/run-log.ts --nx <project:target> [args...]",
  );
  process.exit(1);
}

let name: string;
let cmd: string[];

if (rawArgs[0] === "--nx") {
  const nxTarget = rawArgs[1];
  if (!nxTarget) {
    console.error(
      "usage: tsx plugins/run-log.ts --nx <project:target> [args...]",
    );
    process.exit(1);
  }
  // "diceshock:dev" → name="diceshock-dev", cmd=["npx", "nx", "run", "diceshock:dev", ...]
  name = nxTarget.replace(/:/g, "-");
  const extra = rawArgs.slice(2);
  cmd = ["npx", "nx", "run", nxTarget, ...extra];
} else {
  name = rawArgs[0];
  cmd = rawArgs.slice(1);
}

const cmdLine = cmd.join(" ");
const log = new RotatingLog(name, cmdLine);

console.log(`[${name}] log → ${agentsDir}/`);
console.log(`[${name}] running: ${cmdLine}`);

const child = spawn(cmd[0], cmd.slice(1), {
  cwd: process.cwd(),
  stdio: ["inherit", "pipe", "pipe"],
  env: { ...process.env, FORCE_COLOR: "0" },
});

child.stdout.on("data", (chunk: Buffer) => {
  const text = chunk.toString();
  process.stdout.write(text);
  log.write(text);
});

child.stderr.on("data", (chunk: Buffer) => {
  const text = chunk.toString();
  process.stderr.write(text);
  log.write(text);
});

child.on("close", (code) => {
  log.end();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
