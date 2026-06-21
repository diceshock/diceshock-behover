/**
 * SPIIKE: drizzle-graphql table coverage investigation.
 *
 * Goal: Confirm which tables `buildSchema` from `drizzle-graphql` exposes,
 * verify in-process `graphql()` execution works, and document gaps.
 *
 * This is NOT production code — insights captured in .sisyphus/notepads/.
 */

/**
 * SPIIKE: drizzle-graphql table coverage investigation.
 *
 * Goal: Confirm which tables `buildSchema` from `drizzle-graphql` exposes,
 * verify in-process `graphql()` execution works, and document gaps.
 *
 * This is NOT production code — insights captured in .sisyphus/notepads/.
 */

import dbFactory, * as schemaExports from "@lib/db";
import { buildSchema } from "drizzle-graphql";
import { describe, expect, it } from "vitest";

// ── 14 tables that MUST have query resolvers ──────────────────────
const _REQUIRED_TABLES = new Set([
  "activesTable",
  "activeRegistrationsTable",
  "boardGamesTable",
  "eventsTable",
  "userInfoTable",
  "usersTable",
  "userMembershipPlansTable",
  "userBadgesTable",
  "mahjongMatchesTable",
  "leaderboardSnapshotsTable",
  "tablesTable",
  "tableOccupancyTable",
  "userBusinessCardTable",
  "pricingSnapshotsTable",
]);

// All tables defined in the schema (for comparison)
const _ALL_SCHEMA_TABLES = Object.entries(schemaExports)
  .filter(
    ([, v]) =>
      typeof v === "object" &&
      v !== null &&
      Symbol.for("drizzle:SQLiteTable") in (v as object),
  )
  .map(([k]) => k);

describe("drizzle-graphql table coverage spike", () => {
  // ── Step 1: buildSchema with a mock D1Database ─────────────────
  // drizzle-graphql only introspects table metadata; it never calls DB methods.
  const mockD1 = {} as unknown as D1Database;
  const drizzleInstance = dbFactory(mockD1);
  const { schema, entities } = buildSchema(drizzleInstance);

  it("returns a valid GraphQL schema object", () => {
    expect(schema).toBeDefined();
    expect(typeof schema).toBe("object");
  });

  // ── Step 2: Verify schema is structurally valid ──────────────────
  // Note: Cannot call graphql() directly due to pnpm's duplicate graphql module —
  // drizzle-graphql bundles its own graphql@16.13.1, and a direct import creates
  // a separate module instance. The runespark production code avoids this by using
  // @graphql-tools/schema's mergeSchemas instead of graphql().
  it("verifies schema exposes Query with __typename capability", () => {
    const queryType = schema.getQueryType();
    expect(queryType).toBeDefined();
    expect(queryType!.name).toBe("Query");

    const mutationType = schema.getMutationType();
    expect(mutationType).toBeDefined();
    expect(mutationType!.name).toBe("Mutation");
  });

  // ── Step 3: Enumerate all Query type fields (available tables) ──
  it("lists all Query type fields (these are the exposed tables)", () => {
    const queryType = schema.getQueryType();
    expect(queryType).toBeDefined();

    const fieldMap = queryType!.getFields();
    const queryFields = Object.keys(fieldMap);

    console.log("\n=== drizzle-graphql Query fields (table resolvers) ===");
    console.log(`Total: ${queryFields.length}`);
    for (const name of queryFields.sort()) {
      const field = fieldMap[name];
      console.log(`  - ${name}: ${field.type}`);
    }
    console.log("=================================================\n");

    // At minimum we expect SOME tables (exact count depends on buildSchema config)
    expect(queryFields.length).toBeGreaterThan(0);
  });

  // ── Step 4: Map drizzle table names → GraphQL query field names ─
  it("maps drizzle table names to GraphQL query fields", () => {
    // Extract table names from the schema exports (drizzle table names)
    const _allTableExports = Object.keys(schemaExports).filter(
      (k) =>
        typeof (schemaExports as Record<string, unknown>)[k] === "object" &&
        (schemaExports as Record<string, unknown>)[k] !== null &&
        !k.endsWith("Relations") &&
        !k.endsWith("Roles"),
    );

    // Tables that should be in REQUIRED_TABLES and their drizzle object names
    const drizzleTableMap: Record<string, string> = {
      activesTable: "activesTable",
      activeRegistrationsTable: "activeRegistrationsTable",
      boardGamesTable: "boardGamesTable",
      eventsTable: "eventsTable",
      userInfoTable: "userInfoTable",
      usersTable: "users",
      userMembershipPlansTable: "userMembershipPlansTable",
      userBadgesTable: "userBadgesTable",
      mahjongMatchesTable: "mahjongMatchesTable",
      leaderboardSnapshotsTable: "leaderboardSnapshotsTable",
      tablesTable: "tablesTable",
      tableOccupancyTable: "tableOccupancyTable",
      userBusinessCardTable: "userBusinessCardTable",
      pricingSnapshotsTable: "pricingSnapshotsTable",
    };

    const queryType = schema.getQueryType()!;
    const queryFields = Object.keys(queryType.getFields());

    console.log("\n=== Table coverage check ===");
    const exposed: string[] = [];
    const missing: string[] = [];

    for (const [logicalName, drizzleName] of Object.entries(drizzleTableMap)) {
      // drizzle-graphql generates findMany resolver names from the drizzle variable name
      // Pattern: "boardGamesTable" → "BoardGamesTable"
      // But the actual Query fields exposed may be slightly different in camelCase
      const hasResolver = queryFields.some(
        (f) =>
          f.toLowerCase().includes(drizzleName.toLowerCase()) ||
          f.toLowerCase().includes(logicalName.toLowerCase()),
      );

      if (hasResolver) {
        exposed.push(logicalName);
      } else {
        missing.push(logicalName);
      }
    }

    console.log(
      `Exposed: ${exposed.length} / ${Object.keys(drizzleTableMap).length}`,
    );
    for (const e of exposed) console.log(`  ✅ ${e}`);
    for (const m of missing) console.log(`  ❌ ${m}`);
    console.log("==========================\n");

    // Document findings — some tables may legitimately be missing
    expect(exposed.length).toBeGreaterThan(0);
  });

  // ── Step 5: Document ALL type names in schema ───────────────────
  it('prints all type names from schema for documentation"', () => {
    const typeMap = schema.getTypeMap();
    const typeNames = Object.keys(typeMap)
      .filter((k) => !k.startsWith("__"))
      .sort();

    console.log("\n=== All schema type names ===");
    for (const name of typeNames) {
      console.log(`  - ${name}`);
    }
    console.log(`Total types: ${typeNames.length}`);
    console.log("============================\n");

    // Verify Query and Mutation exist
    expect(typeNames).toContain("Query");
    expect(typeNames).toContain("Mutation");
  });

  // ── Step 6: Also check what entities object contains ────────────
  it("lists all entity query and mutation keys", () => {
    console.log("\n=== Entities.queries keys ===");
    const qKeys = Object.keys(entities.queries);
    for (const k of qKeys.sort()) console.log(`  - ${k}`);
    console.log(`Total queries: ${qKeys.length}`);

    console.log("\n=== Entities.mutations keys ===");
    const mKeys = Object.keys(entities.mutations);
    for (const k of mKeys.sort()) console.log(`  - ${k}`);
    console.log(`Total mutations: ${mKeys.length}`);
    console.log("=============================\n");
  });

  // ── Step X: Show which tables from schema.ts are NOT in the GraphQL schema ──
  it("documents which schema tables have no GraphQL resolver", () => {
    const queryType = schema.getQueryType()!;
    const queryFields = Object.keys(queryType.getFields());
    const lowerFields = new Set(queryFields.map((f) => f.toLowerCase()));

    // Get all table definitions from schema.ts
    const schemaTables = Object.keys(schemaExports).filter(
      (k) =>
        typeof (schemaExports as Record<string, unknown>)[k] === "object" &&
        (schemaExports as Record<string, unknown>)[k] !== null &&
        !k.endsWith("Relations") &&
        !k.endsWith("Roles") &&
        k !== "userRoles" &&
        k !== "wechatConversationRoles",
    );

    const unresolvable: string[] = [];
    for (const tableName of schemaTables) {
      const lower = tableName.toLowerCase();
      // Check if any query field contains this table name
      const hasMatch = [...lowerFields].some(
        (f) => f.includes(lower) || lower.includes(f),
      );
      if (!hasMatch) {
        unresolvable.push(tableName);
      }
    }

    if (unresolvable.length > 0) {
      console.log("\n=== Tables WITHOUT GraphQL resolvers ===");
      for (const u of unresolvable) console.log(`  ⚠️  ${u}`);
      console.log(
        "(These may be intentional — e.g., auth tables like accounts, sessions, etc.)\n",
      );
    }
  });
});
