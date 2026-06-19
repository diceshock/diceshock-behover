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
  boardGames: "boardGamesTable",
  boardgames: "boardGamesTable",
  board_games: "boardGamesTable",
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
  _ilike: "ilike",
  _notLike: "notLike",
  _notIlike: "notIlike",
  _in: "inArray",
  _nin: "notInArray",
  _inArray: "inArray",
  _notInArray: "notInArray",
  _isNull: "isNull",
  _isNotNull: "isNotNull",
  contains: "ilike",
  startsWith: "ilike",
  endsWith: "ilike",
  _contains: "ilike",
  _startsWith: "ilike",
  _endsWith: "ilike",
  equals: "eq",
  not: "ne",
  in: "inArray",
  notIn: "notInArray",
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

function loc(node: ASTNode): string {
  if (node.loc)
    return `(行${node.loc.startToken.line}:列${node.loc.startToken.column})`;
  return "";
}

export function normalizeQuery(
  source: string,
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
        result.errors.push(
          `发现变量引用 $${node.name.value}${loc(node)}。请直接内联值，不要使用 $变量 语法。`,
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
