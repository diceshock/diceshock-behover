#!/usr/bin/env node

/**
 * Post-codegen hook: generates __generated__/index.ts as a barrel that
 * re-exports schema.ts (enum values) and operations.ts (hooks, query types),
 * explicitly resolving name conflicts so schema enums are exported as values.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const GEN = join("src", "client", "graphql", "__generated__");

interface Exports {
  values: Set<string>;
  types: Set<string>;
}

/**
 * Parse exported names from a generated file, distinguishing values from types.
 * Values: const, function, class, enum, const enum
 * Types: type, interface
 */
function extractExports(file: string): Exports {
  const src = readFileSync(join(GEN, file), "utf8");
  const values = new Set<string>();
  const types = new Set<string>();
  for (const m of src.matchAll(
    /^export\s+(type|enum|const enum|interface|const|function|class)\s+(\w+)/gm,
  )) {
    const kind = m[1];
    const name = m[2];
    if (kind === "type" || kind === "interface") {
      types.add(name);
    } else {
      values.add(name);
    }
  }
  return { values, types };
}

const schema = extractExports("schema.ts");
const ops = extractExports("operations.ts");

const schemaAll = new Set([...schema.values, ...schema.types]);
const opsAll = new Set([...ops.values, ...ops.types]);

const opsOnlyValues = [...ops.values].filter((n) => !schemaAll.has(n));
const opsOnlyTypes = [...ops.types].filter((n) => !schemaAll.has(n));
const overlap = [...opsAll].filter((n) => schemaAll.has(n));

const lines: string[] = [
  "/* eslint-disable */",
  "// Auto-generated barrel — do not edit. Regenerate with: pnpm codegen",
  "",
  "// Schema types & enums (exported as values so they can be used at runtime).",
  'export * from "./schema";',
  "",
  "// Operation-specific values (hooks, document constants).",
];

if (opsOnlyValues.length > 0) {
  lines.push("export {");
  for (const n of opsOnlyValues) {
    lines.push(`  ${n},`);
  }
  lines.push('} from "./operations";');
}

if (opsOnlyTypes.length > 0) {
  lines.push("");
  lines.push("// Operation-specific types.");
  lines.push("export type {");
  for (const n of opsOnlyTypes) {
    lines.push(`  ${n},`);
  }
  lines.push('} from "./operations";');
}

lines.push("");

writeFileSync(join(GEN, "index.ts"), lines.join("\n"));
console.log(
  `[gen-gql-barrel] wrote index.ts — ${schemaAll.size} schema, ${opsOnlyValues.length} value exports, ${opsOnlyTypes.length} type exports, ${overlap.length} overlap resolved`,
);
