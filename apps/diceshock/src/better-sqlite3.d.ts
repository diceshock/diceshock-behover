declare module "better-sqlite3" {
  interface Statement {
    run(...params: unknown[]): RunResult;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  interface RunResult {
    changes: number;
    lastInsertRowid: number | bigint;
  }

  class Database {
    constructor(filename: string, options?: Record<string, unknown>);
    prepare(sql: string): Statement;
    exec(sql: string): void;
    close(): void;
  }

  export default Database;
}
