import type { ExecException } from "node:child_process";
import { exec } from "node:child_process";
import path from "node:path";
import type { ViteDevServer } from "vite";

export default function cmdWatch(
  options: { watch: string | string[]; command: string; cwd?: string } = {
    watch: ["src/**/*.ts"],
    command: "echo 'Command to run not set'",
  },
) {
  return {
    name: "cmd-watch",
    configureServer(server: ViteDevServer) {
      const watchPaths = Array.isArray(options.watch)
        ? options.watch
        : [options.watch];
      server.watcher.add(watchPaths);

      server.watcher.on("change", (filePath: string) => {
        console.log(`🌀 [CMD] File changed: ${filePath}`);
        console.log(`🌀 [CMD] Running: ${options.command}`);

        // 确定工作目录：优先使用配置的 cwd，否则使用 vite 配置的根目录
        const cwd = options.cwd
          ? path.resolve(options.cwd)
          : server.config.root
            ? path.resolve(server.config.root)
            : process.cwd();

        exec(
          options.command,
          {
            shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
            cwd,
            env: { ...process.env, FORCE_COLOR: "1" },
          },
          (err: ExecException | null, stdout: string, stderr: string) => {
            if (err) {
              console.error("❌ CMD failed");
              console.error(`Command: ${options.command}`);
              console.error(`Working directory: ${cwd}`);
              if (stderr) console.error(`Stderr: ${stderr}`);
              if (stdout) console.error(`Stdout: ${stdout}`);
              console.error(`Error: ${err.message}`);
              if (err.code) console.error(`Exit code: ${err.code}`);
            } else {
              console.log("✅ CMD completed");
              if (stdout) console.log(stdout);
            }
          },
        );
      });
    },
  };
}
