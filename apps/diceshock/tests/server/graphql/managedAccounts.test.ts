import { graphql } from "graphql";
import { buildSchema } from "drizzle-graphql";
import { describe, expect, it } from "vitest";
import type { GQLContext } from "@/server/graphql/context";
import { managedAccountsSchema } from "@/server/graphql/managedAccounts";
import { mergeSchemas } from "@/server/graphql/schema";
import { createDatabase } from "../trpg/database";

const source = `mutation($name:String!,$phone:String!,$role:String!,$password:String) {
  createManagedUser(name:$name,phone:$phone,role:$role,password:$password)
}`;

function context(role: GQLContext["role"]): GQLContext {
  return { role, userId: "staff-1" } as GQLContext;
}

describe("managed account creation permissions", () => {
  it("mounts the Pothos mutation in the existing GraphQL schema", () => {
    const fixture = createDatabase();
    try {
      const autoSchema = buildSchema(fixture.db).schema;
      const schema = mergeSchemas(autoSchema, "", {});
      expect(schema.getMutationType()?.getFields().createManagedUser).toBeDefined();
    } finally {
      fixture.sqlite.close();
    }
  });
  it("rejects a staff attempt to create another staff account", async () => {
    const result = await graphql({
      schema: managedAccountsSchema,
      source,
      contextValue: context("staff"),
      variableValues: { name: "Staff", phone: "13800000000", role: "STAFF", password: "initial-pass" },
    });
    expect(result.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
  });

  it("requires an initial password for a host", async () => {
    const result = await graphql({
      schema: managedAccountsSchema,
      source,
      contextValue: context("admin"),
      variableValues: { name: "Host", phone: "13800000001", role: "HOST" },
    });
    expect(result.errors?.[0]?.extensions.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a password for a customer account", async () => {
    const result = await graphql({
      schema: managedAccountsSchema,
      source,
      contextValue: context("staff"),
      variableValues: { name: "Customer", phone: "13800000002", role: "CUSTOMER", password: "initial-pass" },
    });
    expect(result.errors?.[0]?.extensions.code).toBe("VALIDATION_ERROR");
  });

  it("does not allow hosts to create accounts", async () => {
    const result = await graphql({
      schema: managedAccountsSchema,
      source,
      contextValue: context("authenticated"),
      variableValues: { name: "Customer", phone: "13800000003", role: "CUSTOMER" },
    });
    expect(result.errors?.[0]?.extensions.code).toBe("FORBIDDEN");
  });

  it("creates a host with credentials and global store access, and rejects a duplicate phone", async () => {
    const fixture = createDatabase();
    try {
      fixture.sqlite.exec(`CREATE TABLE user_credentials (
        user_id TEXT PRIMARY KEY, password_hash TEXT NOT NULL, salt TEXT NOT NULL,
        iterations INTEGER NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      )`);
      const ctx = {
        db: fixture.db,
        env: { DB: fixture.d1 },
        role: "admin",
        userId: "admin",
      } as GQLContext;
      const variables = { name: "New host", phone: "13900000001", role: "HOST", password: "initial-pass" };
      const created = await graphql({ schema: managedAccountsSchema, source, contextValue: ctx, variableValues: variables });
      expect(created.errors).toBeUndefined();
      const id = (created.data as { createManagedUser: string }).createManagedUser;
      expect(fixture.sqlite.prepare(`SELECT role FROM "user" WHERE id=?`).get(id)?.role).toBe("host");
      expect(fixture.sqlite.prepare("SELECT count(*) AS n FROM trpg_access WHERE user_id=? AND host=1").get(id)?.n).toBe(2);
      expect(fixture.sqlite.prepare("SELECT count(*) AS n FROM user_credentials WHERE user_id=?").get(id)?.n).toBe(1);
      const duplicate = await graphql({ schema: managedAccountsSchema, source, contextValue: ctx, variableValues: variables });
      expect(duplicate.errors?.[0]?.extensions.code).toBe("VALIDATION_ERROR");
      expect(fixture.sqlite.prepare("SELECT count(*) AS n FROM user_info WHERE phone=?").get(variables.phone)?.n).toBe(1);
    } finally {
      fixture.sqlite.close();
    }
  });
});
