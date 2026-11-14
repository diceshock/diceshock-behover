import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import dbFactory from "@lib/db";

// Executes the production Drizzle SQL against SQLite, not a canned query mock.
export function createDatabase() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`PRAGMA foreign_keys=ON;
 CREATE TABLE "user" (id TEXT PRIMARY KEY,name TEXT,email TEXT,emailVerified INTEGER,image TEXT,role TEXT NOT NULL DEFAULT 'customer',disabled INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE user_info (id TEXT PRIMARY KEY REFERENCES "user"(id),uid TEXT NOT NULL,nickname TEXT NOT NULL,phone TEXT,points INTEGER,create_at INTEGER,avatar_url TEXT,meta TEXT,preferred_store_id TEXT,preferred_locale TEXT,preferred_theme TEXT);
 CREATE TABLE stores (id TEXT PRIMARY KEY,code TEXT,name TEXT NOT NULL,address TEXT,is_active INTEGER,created_at INTEGER);
 CREATE TABLE tables (id TEXT PRIMARY KEY,name TEXT,store_id TEXT REFERENCES stores(id),capacity INTEGER,status TEXT,scope TEXT,type TEXT,description TEXT,code TEXT,create_at INTEGER,update_at INTEGER);
 CREATE TABLE user_membership_plans (id TEXT,user_id TEXT,plan_type TEXT,amount INTEGER);
 CREATE TABLE session (sessionToken TEXT PRIMARY KEY,userId TEXT REFERENCES "user"(id),expires INTEGER);
 CREATE TABLE account (userId TEXT REFERENCES "user"(id),type TEXT,provider TEXT,providerAccountId TEXT,PRIMARY KEY(provider,providerAccountId));
 `);
  sqlite.exec(
    readFileSync(
      new URL("../../../../../drizzle/0056_trpg_workflow.sql", import.meta.url),
      "utf8",
    ),
  );
  class Statement {
    constructor(
      readonly query: string,
      readonly params: SQLInputValue[] = [],
    ) {}
    bind(...params: SQLInputValue[]) {
      return new Statement(this.query, params);
    }
    async raw() {
      const stmt = sqlite.prepare(this.query);
      stmt.setReturnArrays(true);
      return stmt.all(...this.params);
    }
    async all() {
      const stmt = sqlite.prepare(this.query);
      const results = stmt.all(...this.params);
      return { results, success: true, meta: { changes: 0 } };
    }
    async first(column?: string) {
      const row = sqlite.prepare(this.query).get(...this.params);
      return column ? (row?.[column] ?? null) : (row ?? null);
    }
    async run() {
      const result = sqlite.prepare(this.query).run(...this.params);
      return {
        results: [],
        success: true,
        meta: {
          changes: Number(result.changes),
          last_row_id: Number(result.lastInsertRowid),
        },
      };
    }
  }
  const d1 = {
    prepare: (query: string) => new Statement(query),
    batch: async (statements: Statement[]) => {
      sqlite.exec("BEGIN");
      try {
        const results = [];
        for (const statement of statements) results.push(await statement.run());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  } as unknown as Parameters<typeof dbFactory>[0];
  sqlite.exec(`INSERT INTO stores(id,code,name,is_active) VALUES ('a','a','Store A',1),('b','b','Store B',1);
 INSERT INTO tables(id,name,store_id,capacity,status,scope,type,code) VALUES ('ta','Table A','a',6,'active','trpg','fixed','ta'),('tb','Table B','b',6,'active','trpg','fixed','tb');
 INSERT INTO "user"(id,name,role) VALUES ('admin','Admin','admin'),('staff','Staff','staff'),('host','Host','customer'),('p1','P1','customer'),('p2','P2','customer'),('outsider','Outsider','customer');
 INSERT INTO user_info(id,uid,nickname,phone,points) SELECT id,id,name,'13800000000',0 FROM "user";
 INSERT INTO trpg_access(user_id,store_id,staff,host) VALUES ('staff','a',1,0),('host','a',0,1),('host','b',0,1);`);
  return { db: dbFactory(d1), d1, sqlite };
}
