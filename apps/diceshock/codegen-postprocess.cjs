/**
 * Post-processes graphql-codegen output to:
 * 1. Remove duplicate type/enum declarations already in schema.ts
 * 2. Add `import type { ... }` for schema types used in operations.ts
 * 3. Strip incompatible SuspenseQuery overload signatures
 */
const fs = require("fs");
const path = require("path");

const dir = path.resolve(__dirname, "src/client/graphql/__generated__");
const schemaPath = path.join(dir, "schema.ts");
const opsPath = path.join(dir, "operations.ts");

// 1. Collect exported names from schema.ts
const schema = fs.readFileSync(schemaPath, "utf-8");
const schemaNames = new Set();
for (const m of schema.matchAll(/^export (?:enum|type) (\w+)/gm)) {
  schemaNames.add(m[1]);
}

// 2. Read operations.ts and strip duplicate declarations
let lines = fs.readFileSync(opsPath, "utf-8").split("\n");
let out = [];
let skip = false;
let depth = 0;

for (const line of lines) {
  if (skip) {
    for (const c of line) {
      if (c === "{") depth++;
      if (c === "}") depth--;
    }
    if (depth <= 0 && (line.endsWith(";") || line === "}" || line.trim() === "")) {
      skip = false;
    }
    continue;
  }
  const m = line.match(/^export (?:type|enum) (\w+)/);
  if (
    m &&
    schemaNames.has(m[1]) &&
    !/Query|Mutation|Subscription|Variables|HookResult|Result|Options|Fn$/.test(m[1])
  ) {
    skip = true;
    depth = 0;
    for (const c of line) {
      if (c === "{") depth++;
      if (c === "}") depth--;
    }
    if (depth <= 0 && line.endsWith(";")) skip = false;
    continue;
  }
  out.push(line);
}

// 3. Strip @ts-ignore lines
out = out.filter((line) => line.trim() !== "// @ts-ignore");

// 4. Strip incompatible SuspenseQuery overload signatures
const final = [];
for (let i = 0; i < out.length; i++) {
  if (
    /^export function use\w+SuspenseQuery\(/.test(out[i]) &&
    out[i].trimEnd().endsWith(";") &&
    i + 2 < out.length &&
    /^export function use\w+SuspenseQuery\(/.test(out[i + 1]) &&
    out[i + 1].trimEnd().endsWith(";") &&
    /^export function use\w+SuspenseQuery\(/.test(out[i + 2]) &&
    out[i + 2].trimEnd().endsWith("{")
  ) {
    // Skip first overload; loop increment skips second
    i += 1;
    continue;
  }
  final.push(out[i]);
}

// 5. Add import for schema types actually used in operations body
const body = final.join("\n");
const usedNames = [...schemaNames].filter((name) => {
  const re = new RegExp("\\b" + name + "\\b");
  return re.test(body);
});

if (usedNames.length > 0) {
  const importLine = `import type { ${usedNames.join(", ")} } from './schema';`;
  const eslintIdx = final.findIndex((l) => l.includes("eslint-disable"));
  final.splice(eslintIdx + 1, 0, importLine);
}

fs.writeFileSync(opsPath, final.join("\n"));
console.log(
  `codegen-postprocess: stripped ${lines.length - final.length} lines, imported ${usedNames.length} schema types`
);
