import {
  createWriteStream,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  type WriteStream,
} from "node:fs";
import { resolve } from "node:path";

const MAX_LINES = 20_000;
const MAX_FILES = 3;
const MAX_TRASH = 15;

const root = process.env.NX_WORKSPACE_ROOT ?? process.cwd();
export const agentsDir = resolve(root, ".agents");
const trashDir = resolve(agentsDir, "trash");

mkdirSync(agentsDir, { recursive: true });
mkdirSync(trashDir, { recursive: true });

function timestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function moveToTrash(filePath: string, fileName: string) {
  try {
    renameSync(filePath, resolve(trashDir, fileName));
  } catch {}
}

function pruneTrash() {
  try {
    const files = readdirSync(trashDir)
      .filter((f) => f.endsWith(".log"))
      .map((f) => ({
        name: f,
        mtime: statSync(resolve(trashDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    for (const f of files.slice(MAX_TRASH)) {
      try {
        unlinkSync(resolve(trashDir, f.name));
      } catch {}
    }
  } catch {}
}

export class RotatingLog {
  private stream: WriteStream;
  private lineCount = 0;
  private startLine = 1;
  private readonly name: string;
  private lastContent = "";
  private repeatCount = 0;

  constructor(name: string, header?: string) {
    this.name = name;
    this.archiveExisting();
    this.stream = this.openNew();
    pruneTrash();
    if (header) {
      this.writeLine(`[${timestamp()}] > ${header}`);
    }
  }

  write(text: string) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === lines.length - 1 && line.length === 0) continue;

      if (line === this.lastContent) {
        this.repeatCount++;
      } else {
        this.flushPending();
        this.lastContent = line;
        this.repeatCount = 1;
      }
    }
  }

  end() {
    this.flushPending();
    this.finalizeFileName();
    this.stream.end();
  }

  private archiveExisting() {
    const prefix = `output-${this.name}-`;
    try {
      const files = readdirSync(agentsDir).filter(
        (f) => f.startsWith(prefix) && f.endsWith(".log"),
      );
      for (const f of files) {
        moveToTrash(resolve(agentsDir, f), f);
      }
    } catch {}
  }

  private flushPending() {
    if (this.repeatCount === 0) return;
    const ts = timestamp();
    if (this.repeatCount === 1) {
      this.writeLine(`[${ts}] ${this.lastContent}`);
    } else {
      this.writeLine(`[${ts}] ${this.lastContent} [x${this.repeatCount}]`);
    }
    this.repeatCount = 0;
  }

  private writeLine(formatted: string) {
    this.stream.write(`${formatted}\n`);
    this.lineCount++;
    if (this.lineCount >= MAX_LINES) {
      this.rotate();
    }
  }

  private buildFileName(endLine: number): string {
    return `output-${this.name}-${this.startLine}-${endLine}.log`;
  }

  private openNew(): WriteStream {
    const placeholder = this.buildFileName(0);
    const path = resolve(agentsDir, placeholder);
    return createWriteStream(path, { flags: "w" });
  }

  private finalizeFileName() {
    const endLine = this.startLine + this.lineCount - 1;
    const oldName = this.buildFileName(0);
    const newName = this.buildFileName(endLine > 0 ? endLine : 0);
    const oldPath = resolve(agentsDir, oldName);
    const newPath = resolve(agentsDir, newName);
    try {
      renameSync(oldPath, newPath);
    } catch {}
  }

  private rotate() {
    this.finalizeFileName();
    this.stream.end();
    this.startLine += this.lineCount;
    this.lineCount = 0;
    this.stream = this.openNew();
  }
}
