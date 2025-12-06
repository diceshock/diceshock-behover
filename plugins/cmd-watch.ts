import type { ExecException } from "node:child_process";
import { exec } from "node:child_process";
import path from "node:path";
import type { ViteDevServer } from "vite";

function matchesPattern(
  filePath: string,
  pattern: string,
  root: string,
): boolean {
  // 将 glob 模式转换为正则表达式
  const relativePath = path.relative(root, filePath);
  const normalizedPattern = pattern
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*");
  const regex = new RegExp(`^${normalizedPattern.replace(/\//g, "\\/")}$`);
  return regex.test(relativePath) || regex.test(filePath);
}

export default function cmdWatch(
  options: {
    watch: string | string[];
    command: string;
    cwd?: string;
    delay?: number; // 延迟执行时间（毫秒），用于等待服务器重启
  } = {
    watch: ["src/**/*.ts"],
    command: "echo 'Command to run not set'",
    delay: 0,
  },
) {
  return {
    name: "cmd-watch",
    configureServer(server: ViteDevServer) {
      const watchPatterns = Array.isArray(options.watch)
        ? options.watch
        : [options.watch];

      // 将相对路径转换为绝对路径
      const root = server.config.root || process.cwd();

      // 从 glob 模式中提取目录路径
      const watchDirs = new Set<string>();
      watchPatterns.forEach((pattern) => {
        // 移除 glob 部分，只保留目录路径
        // 例如: "src/server/**/*.ts" -> "src/server"
        const dirPattern = pattern
          .replace(/\/\*\*\/.*$/, "")
          .replace(/\/\*.*$/, "");
        const dirPath = path.isAbsolute(dirPattern)
          ? dirPattern
          : path.resolve(root, dirPattern);
        watchDirs.add(dirPath);
      });

      // 添加监听目录（watcher.add 需要目录路径，不支持 glob）
      watchDirs.forEach((dirPath) => {
        try {
          server.watcher.add(dirPath);
          console.log(`🌀 [CMD] Watching directory: ${dirPath}`);
        } catch (err) {
          console.warn(`⚠️ [CMD] Failed to watch directory: ${dirPath}`, err);
        }
      });

      let timeoutId: NodeJS.Timeout | null = null;

      const handleFileChange = (filePath: string) => {
        // 检查文件是否匹配 watch 模式
        const matches = watchPatterns.some((pattern) => {
          return matchesPattern(filePath, pattern, root);
        });

        if (!matches) {
          return;
        }

        console.log(`🌀 [CMD] File changed: ${filePath}`);

        // 清除之前的延迟
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        // 延迟执行，等待服务器重启
        const delay = options.delay ?? 2000; // 默认延迟 2 秒
        timeoutId = setTimeout(() => {
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
        }, delay);
      };

      // 监听 change 和 add 事件
      server.watcher.on("change", handleFileChange);
      server.watcher.on("add", handleFileChange);
    },
  };
}
