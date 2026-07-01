export type FilterOperator = "eq" | "gt" | "lt" | "range" | "in";
export type FilterValue = {
  operator: FilterOperator;
  value: string | string[] | [string, string];
};
export type SearchParseError = {
  key: string;
  value: string;
  message: string;
};
export type ParsedSearch = {
  freeText: string;
  filters: Record<string, FilterValue>;
  errors: SearchParseError[];
};

export type FieldDef = {
  type: "string" | "date" | "enum" | "boolean";
  values?: string[];
};
export type SearchGrammar = Record<string, FieldDef>;

export const ORDER_SEARCH_GRAMMAR = {
  status: { type: "enum", values: ["active", "paused", "ended"] },
  table: { type: "string" },
  user: { type: "string" },
  date: { type: "date" },
  store: { type: "string" },
  is: { type: "boolean", values: ["active", "paused"] },
} satisfies SearchGrammar;

export const USER_SEARCH_GRAMMAR = {
  role: { type: "enum", values: ["admin", "staff", "authenticated"] },
  store: { type: "string" },
  name: { type: "string" },
  date: { type: "date" },
} satisfies SearchGrammar;

export const TABLE_SEARCH_GRAMMAR = {
  type: { type: "enum", values: ["fixed", "solo"] },
  status: { type: "enum", values: ["active", "inactive"] },
  store: { type: "string" },
  name: { type: "string" },
} satisfies SearchGrammar;

export const ACTIVE_SEARCH_GRAMMAR = {
  status: { type: "enum", values: ["active", "expired"] },
  type: { type: "string" },
  store: { type: "string" },
  creator: { type: "string" },
  date: { type: "date" },
} satisfies SearchGrammar;

export const EVENT_SEARCH_GRAMMAR = {
  status: { type: "enum", values: ["active", "ended", "upcoming"] },
  type: { type: "string" },
  date: { type: "date" },
  store: { type: "string" },
} satisfies SearchGrammar;

export const GSZ_SEARCH_GRAMMAR = {
  mode: { type: "enum", values: ["3p", "4p"] },
  format: { type: "enum", values: ["tonpuu", "hanchan"] },
  sync: { type: "enum", values: ["synced", "unsynced"] },
  completion: { type: "enum", values: ["completed", "incomplete"] },
  table: { type: "string" },
  date: { type: "date" },
} satisfies SearchGrammar;

const KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;

export function parseSearch(
  input: string,
  grammar: SearchGrammar,
): ParsedSearch {
  const freeText: string[] = [];
  const filters: Record<string, FilterValue> = {};
  const errors: SearchParseError[] = [];

  for (const token of tokenize(input)) {
    const separatorIndex = token.indexOf(":");

    if (separatorIndex <= 0) {
      freeText.push(token);
      continue;
    }

    const key = token.slice(0, separatorIndex);
    const rawValue = token.slice(separatorIndex + 1);

    if (!KEY_PATTERN.test(key)) {
      freeText.push(token);
      continue;
    }

    const field = grammar[key];
    if (!field) {
      errors.push({
        key,
        value: rawValue,
        message: `Unsupported search key: ${key}`,
      });
      continue;
    }

    const parsed = parseFilterValue(key, rawValue, field);
    if ("error" in parsed) {
      errors.push(parsed.error);
      continue;
    }

    filters[key] = parsed.filter;
  }

  return {
    freeText: freeText.join(" "),
    filters,
    errors,
  };
}

export function serialize(
  parsed: ParsedSearch,
  grammar: SearchGrammar,
): string {
  const parts: string[] = [];

  for (const [key, filter] of Object.entries(parsed.filters)) {
    if (!grammar[key]) continue;

    const value = serializeFilterValue(filter);
    if (!value) continue;
    parts.push(`${key}:${quoteToken(value)}`);
  }

  if (parsed.freeText) {
    parts.push(quoteToken(parsed.freeText));
  }

  return parts.join(" ");
}

export function getAvailableKeys(grammar: SearchGrammar): string[] {
  return Object.keys(grammar);
}

export function toGqlVariables(
  parsed: ParsedSearch,
  entityType: string,
): Record<string, unknown> {
  const entity = entityType.toLowerCase();

  if (["order", "orders"].includes(entity)) {
    return compact({
      search: joinSearchParts(
        parsed.freeText,
        filterString(parsed, "table"),
        filterString(parsed, "user"),
      ),
      status: mapOrderStatus(
        filterString(parsed, "is") ?? filterString(parsed, "status"),
      ),
      storeId: filterString(parsed, "store"),
      ...dateVariables(parsed, "date"),
    });
  }

  if (["user", "users"].includes(entity)) {
    return compact({
      searchWords: joinSearchParts(
        parsed.freeText,
        filterString(parsed, "name"),
      ),
      role: uppercaseFilter(parsed, "role"),
      storeId: filterString(parsed, "store"),
    });
  }

  if (["table", "tables"].includes(entity)) {
    return compact({
      search: joinSearchParts(parsed.freeText, filterString(parsed, "name")),
      type: uppercaseFilter(parsed, "type"),
      status: uppercaseFilter(parsed, "status"),
      storeId: filterString(parsed, "store"),
    });
  }

  if (["active", "actives"].includes(entity)) {
    return compact({
      search: joinSearchParts(
        parsed.freeText,
        filterString(parsed, "type"),
        filterString(parsed, "creator"),
      ),
      showExpired: mapActiveExpired(parsed),
      storeId: filterString(parsed, "store"),
    });
  }

  if (["event", "events"].includes(entity)) {
    return compact({
      search: joinSearchParts(parsed.freeText, filterString(parsed, "type")),
      status: uppercaseFilter(parsed, "status"),
      storeId: filterString(parsed, "store"),
      ...dateVariables(parsed, "date"),
    });
  }

  if (["gsz", "mahjong", "mahjongmanagement"].includes(entity)) {
    return compact({
      search: parsed.freeText || undefined,
      mode: mapMahjongMode(filterString(parsed, "mode")),
      format: uppercaseFilter(parsed, "format"),
      gszSync: uppercaseFilter(parsed, "sync"),
      completion: uppercaseFilter(parsed, "completion"),
      tableId: filterString(parsed, "table"),
      storeId: filterString(parsed, "store"),
      ...dateVariables(parsed, "date"),
    });
  }

  return compact({ search: parsed.freeText || undefined });
}

function parseFilterValue(
  key: string,
  value: string,
  field: FieldDef,
): { filter: FilterValue } | { error: SearchParseError } {
  if (value.includes(",")) {
    if (field.type === "date") {
      return { error: unsupportedOperatorError(key, value, "in") };
    }

    const values = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const error = validateValues(key, value, values, field);

    return error ? { error } : { filter: { operator: "in", value: values } };
  }

  if (value.startsWith(">")) {
    if (field.type !== "date") {
      return { error: unsupportedOperatorError(key, value, "gt") };
    }

    const dateValue = value.slice(1);
    const error = validateValues(key, value, [dateValue], field);
    return error ? { error } : { filter: { operator: "gt", value: dateValue } };
  }

  if (value.startsWith("<")) {
    if (field.type !== "date") {
      return { error: unsupportedOperatorError(key, value, "lt") };
    }

    const dateValue = value.slice(1);
    const error = validateValues(key, value, [dateValue], field);
    return error ? { error } : { filter: { operator: "lt", value: dateValue } };
  }

  if (value.includes("..")) {
    if (field.type !== "date") {
      return { error: unsupportedOperatorError(key, value, "range") };
    }

    const dates = value.split("..") as [string, string];
    const error =
      dates.length === 2 ? validateValues(key, value, dates, field) : undefined;
    return error || dates.length !== 2
      ? {
          error: error ?? {
            key,
            value,
            message: `Invalid range for ${key}: ${value}`,
          },
        }
      : { filter: { operator: "range", value: dates } };
  }

  const error = validateValues(key, value, [value], field);
  return error ? { error } : { filter: { operator: "eq", value } };
}

function validateValues(
  key: string,
  rawValue: string,
  values: string[],
  field: FieldDef,
): SearchParseError | undefined {
  for (const value of values) {
    if (!value) {
      return { key, value: rawValue, message: `Missing value for ${key}` };
    }

    if (field.type === "date" && !DATE_PATTERN.test(value)) {
      return {
        key,
        value: rawValue,
        message: `Invalid date for ${key}: ${value}`,
      };
    }

    if (field.values && !field.values.includes(value)) {
      return {
        key,
        value: rawValue,
        message: `Invalid value for ${key}: ${value}`,
      };
    }

    if (
      field.type === "boolean" &&
      !field.values &&
      !["true", "false"].includes(value)
    ) {
      return {
        key,
        value: rawValue,
        message: `Invalid boolean for ${key}: ${value}`,
      };
    }
  }

  return undefined;
}

function unsupportedOperatorError(
  key: string,
  value: string,
  operator: FilterOperator,
): SearchParseError {
  return {
    key,
    value,
    message: `Operator ${operator} is not supported for ${key}`,
  };
}

function serializeFilterValue(filter: FilterValue): string | undefined {
  switch (filter.operator) {
    case "eq":
      return typeof filter.value === "string" ? filter.value : undefined;
    case "gt":
      return typeof filter.value === "string" ? `>${filter.value}` : undefined;
    case "lt":
      return typeof filter.value === "string" ? `<${filter.value}` : undefined;
    case "range":
      return Array.isArray(filter.value) ? filter.value.join("..") : undefined;
    case "in":
      return Array.isArray(filter.value) ? filter.value.join(",") : undefined;
  }
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quoted = false;
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\" && quoted) {
      escaping = true;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (/\s/.test(char) && !quoted) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) tokens.push(current);

  return tokens;
}

function quoteToken(value: string): string {
  if (!value) return '""';
  if (!/\s|"/.test(value)) return value;

  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function filterString(parsed: ParsedSearch, key: string): string | undefined {
  const value = parsed.filters[key]?.value;
  return typeof value === "string" ? value : undefined;
}

function uppercaseFilter(
  parsed: ParsedSearch,
  key: string,
): string | string[] | undefined {
  const value = parsed.filters[key]?.value;

  if (typeof value === "string") return value.toUpperCase();
  if (Array.isArray(value)) return value.map((item) => item.toUpperCase());

  return undefined;
}

function joinSearchParts(
  ...parts: Array<string | undefined>
): string | undefined {
  const search = parts.filter(Boolean).join(" ");
  return search || undefined;
}

function mapOrderStatus(value: string | undefined): string | undefined {
  if (!value) return undefined;

  return (
    {
      active: "ACTIVE",
      paused: "PAUSED",
      ended: "SETTLED",
    } satisfies Record<string, string>
  )[value];
}

function mapMahjongMode(value: string | undefined): string | undefined {
  if (!value) return undefined;

  return (
    {
      "3p": "THREE_PLAYER",
      "4p": "FOUR_PLAYER",
    } satisfies Record<string, string>
  )[value];
}

function mapActiveExpired(parsed: ParsedSearch): boolean | undefined {
  const status = filterString(parsed, "status");
  if (status === "expired") return true;
  if (status === "active") return false;
  return undefined;
}

function dateVariables(
  parsed: ParsedSearch,
  key: string,
): Record<string, string> {
  const filter = parsed.filters[key];
  if (!filter) return {};

  if (filter.operator === "gt" && typeof filter.value === "string") {
    return { startDate: filter.value };
  }

  if (filter.operator === "lt" && typeof filter.value === "string") {
    return { endDate: filter.value };
  }

  if (filter.operator === "range" && Array.isArray(filter.value)) {
    return { startDate: filter.value[0], endDate: filter.value[1] };
  }

  if (filter.operator === "eq" && typeof filter.value === "string") {
    return { startDate: filter.value, endDate: filter.value };
  }

  return {};
}

function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([, value]) => value !== undefined && value !== "",
    ),
  );
}
