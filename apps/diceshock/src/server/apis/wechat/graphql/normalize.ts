import {
  type ASTNode,
  type DocumentNode,
  type FieldNode,
  type GraphQLError,
  type GraphQLSchema,
  Kind,
  type ObjectFieldNode,
  parse,
  print,
  type StringValueNode,
  type ValueNode,
  validate,
  visit,
} from "graphql";

export interface NormalizeResult {
  source: string;
  normalized: boolean;
  corrections: string[];
  errors: string[];
}

const FIELD_ALIASES: Record<string, string> = {
  name: "sch_name",
  schName: "sch_name",
  engName: "eng_name",
  gstoneRating: "gstone_rating",
  playerNum: "player_num",
  bestPlayerNum: "best_player_num",
  gstoneId: "gstone_id",
  creatorId: "creator_id",
  boardGameId: "board_game_id",
  activeId: "active_id",
  userId: "user_id",
  isWatching: "is_watching",
  createAt: "create_at",
  startTime: "start_time",
  endTime: "end_time",
};

const TABLE_ALIASES: Record<string, string> = {
  actives: "activesTable",
  active: "activesTable",
  activeList: "activesTable",
  active_list: "activesTable",
  activities: "activesTable",
  boardGames: "boardGamesTable",
  boardgames: "boardGamesTable",
  board_games: "boardGamesTable",
  boardgame: "boardGamesTable",
  boardgame_search: "boardGamesTable",
  boardgame_recommend: "boardGamesTable",
  searchBoardGames: "boardGamesTable",
  searchBoardgame: "boardGamesTable",
  SearchBoardgame: "boardGamesTable",
  SearchBoardGame: "boardGamesTable",
  RecommendBoardGames: "boardGamesTable",
  RecommendGames: "boardGamesTable",
  GetBoardGames: "boardGamesTable",
  GetActives: "activesTable",
  GetActive: "activesTable",
  GetActiveDetail: "activesTable",
  games: "boardGamesTable",
  PartyGames: "boardGamesTable",
  BoardGames: "boardGamesTable",
  SearchGames: "boardGamesTable",
  events: "eventsTable",
  users: "usersTable",
  userInfo: "userInfoTable",
  leaderboard: "leaderboardSnapshotsTable",
  mahjongMatches: "mahjongMatchesTable",
  activeRegistrations: "activeRegistrationsTable",
};

const ARG_ALIASES: Record<string, string> = {
  filter: "where",
  filters: "where",
  sort: "orderBy",
  order: "orderBy",
  first: "limit",
  take: "limit",
  skip: "offset",
};

const OP_ALIASES: Record<string, string> = {
  _eq: "eq",
  _ne: "ne",
  _gt: "gt",
  _gte: "gte",
  _lt: "lt",
  _lte: "lte",
  _like: "like",
  _ilike: "like",
  _notLike: "notLike",
  _notIlike: "notLike",
  _in: "inArray",
  _nin: "notInArray",
  _inArray: "inArray",
  _notInArray: "notInArray",
  _isNull: "isNull",
  _isNotNull: "isNotNull",
  contains: "like",
  startsWith: "like",
  endsWith: "like",
  _contains: "like",
  _startsWith: "like",
  _endsWith: "like",
  equals: "eq",
  not: "ne",
  in: "inArray",
  notIn: "notInArray",
  ilike: "like",
  notIlike: "notLike",
};

const WRAP_OPS = new Set([
  "contains",
  "_contains",
  "startsWith",
  "_startsWith",
  "endsWith",
  "_endsWith",
]);

function wrapLikeValue(op: string, raw: string): string {
  if (op === "contains" || op === "_contains") return `%${raw}%`;
  if (op === "startsWith" || op === "_startsWith") return `${raw}%`;
  if (op === "endsWith" || op === "_endsWith") return `%${raw}`;
  return raw;
}

function valueToASTNode(val: unknown): ValueNode {
  if (val === null) return { kind: Kind.NULL };
  if (typeof val === "string")
    return { kind: Kind.STRING, value: val } as StringValueNode;
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { kind: Kind.INT, value: String(val) };
    return { kind: Kind.FLOAT, value: String(val) };
  }
  if (typeof val === "boolean") return { kind: Kind.BOOLEAN, value: val };
  if (Array.isArray(val))
    return { kind: Kind.LIST, values: val.map(valueToASTNode) };
  if (typeof val === "object" && val !== null) {
    return {
      kind: Kind.OBJECT,
      fields: Object.entries(val).map(([k, v]) => ({
        kind: Kind.OBJECT_FIELD as const,
        name: { kind: Kind.NAME as const, value: k },
        value: valueToASTNode(v),
      })),
    };
  }
  return { kind: Kind.STRING, value: String(val) } as StringValueNode;
}

function loc(node: ASTNode): string {
  if (node.loc)
    return `(行${node.loc.startToken.line}:列${node.loc.startToken.column})`;
  return "";
}

export function normalizeQuery(
  source: string,
  variables?: Record<string, unknown>,
  schema?: GraphQLSchema,
): NormalizeResult {
  const result: NormalizeResult = {
    source,
    normalized: false,
    corrections: [],
    errors: [],
  };

  let doc: DocumentNode;
  try {
    doc = parse(source);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    result.errors.push(`语法解析失败: ${msg}`);
    return result;
  }

  const transformed = visit(doc, {
    OperationDefinition: {
      enter(node) {
        if (node.variableDefinitions && node.variableDefinitions.length > 0) {
          result.corrections.push(
            `移除了 variable 定义${loc(node)} (本系统不支持 GraphQL variables, 请内联值)`,
          );
          return { ...node, variableDefinitions: [] };
        }
        return undefined;
      },
    },

    Field: {
      enter(node: FieldNode) {
        const name = node.name.value;
        if (TABLE_ALIASES[name]) {
          result.corrections.push(
            `表名 "${name}" → "${TABLE_ALIASES[name]}"${loc(node)}`,
          );
          return {
            ...node,
            name: { ...node.name, value: TABLE_ALIASES[name] },
          };
        }
        return undefined;
      },
    },

    Argument: {
      enter(node) {
        const name = node.name.value;
        if (ARG_ALIASES[name]) {
          result.corrections.push(
            `参数 "${name}" → "${ARG_ALIASES[name]}"${loc(node)}`,
          );
          return { ...node, name: { ...node.name, value: ARG_ALIASES[name] } };
        }
        return undefined;
      },
    },

    ObjectField: {
      enter(node: ObjectFieldNode) {
        const name = node.name.value;

        if (FIELD_ALIASES[name]) {
          result.corrections.push(
            `字段 "${name}" → "${FIELD_ALIASES[name]}"${loc(node)}`,
          );
          return {
            ...node,
            name: { ...node.name, value: FIELD_ALIASES[name] },
          };
        }

        if (OP_ALIASES[name]) {
          const target = OP_ALIASES[name];

          if (WRAP_OPS.has(name) && node.value.kind === Kind.STRING) {
            const original = (node.value as StringValueNode).value;
            const wrapped = wrapLikeValue(name, original);
            result.corrections.push(
              `操作符 "${name}" → "${target}", 值 "${original}" → "${wrapped}"${loc(node)}`,
            );
            return {
              ...node,
              name: { ...node.name, value: target },
              value: {
                ...node.value,
                kind: Kind.STRING,
                value: wrapped,
              } as StringValueNode,
            };
          }

          result.corrections.push(`操作符 "${name}" → "${target}"${loc(node)}`);
          return { ...node, name: { ...node.name, value: target } };
        }

        return undefined;
      },
    },

    Variable: {
      enter(node) {
        const varName = node.name.value;
        if (variables && varName in variables) {
          const val = variables[varName];
          result.corrections.push(`变量 $${varName} → 内联值`);
          return valueToASTNode(val);
        }
        result.errors.push(
          `发现变量引用 $${varName}${loc(node)}。请直接内联值，不要使用 $变量 语法。`,
        );
        return undefined;
      },
    },
  });

  const output = print(transformed);

  if (result.errors.length > 0) {
    result.source = output;
    return result;
  }

  if (schema) {
    const validationErrors = validate(schema, transformed);
    if (validationErrors.length > 0) {
      result.source = output;
      result.errors = validationErrors.map(formatValidationError);
      return result;
    }
  }

  result.source = output;
  result.normalized = result.corrections.length > 0;
  return result;
}

function formatValidationError(err: GraphQLError): string {
  const msg = err.message;
  const location = err.locations?.[0];
  const pos = location ? `(行${location.line}:列${location.column})` : "";

  if (msg.includes("Cannot query field")) {
    const match = msg.match(/Cannot query field "([^"]+)" on type "([^"]+)"/);
    if (match) {
      return `字段不存在: "${match[1]}" 在 ${match[2]} 中不存在${pos}。请检查 schema 词条中的正确字段名。`;
    }
  }

  if (msg.includes("Unknown argument")) {
    const match = msg.match(/Unknown argument "([^"]+)" on field/);
    if (match) {
      return `未知参数: "${match[1]}"${pos}。可用参数: where, orderBy, limit, offset。`;
    }
  }

  if (msg.includes("Unknown type")) {
    return `未知类型${pos}: ${msg}`;
  }

  return `${msg}${pos}`;
}
