import { getAuthUser } from "@hono/auth-js";
import {
  type ArgumentNode,
  type DocumentNode,
  type FieldNode,
  Kind,
  parse,
  valueFromASTUntyped,
} from "graphql";
import type { Context } from "hono";
import type { HonoCtxEnv } from "@/shared/types";
import type { PubSubDO } from "../durableObjects/PubSubDO";
import { hasRole, type Role } from "./wechat/graphql/permissions";

type SubscriptionArgs = Record<string, unknown>;
type EnvWithPubSub = Cloudflare.Env & {
  PUBSUB: DurableObjectNamespace<PubSubDO>;
};

function resolveRole(authUser: Awaited<ReturnType<typeof getAuthUser>>): Role {
  if (!authUser) return "public";
  const tokenRole = authUser.token?.role as string;
  if (tokenRole === "admin" || tokenRole === "staff") return tokenRole;
  if (authUser.token?.sub) return "authenticated";
  return "public";
}

function parseVariables(value: string | null): Record<string, unknown> {
  if (!value) return {};
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Variables must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function getFirstSubscriptionField(document: DocumentNode): FieldNode {
  const operation = document.definitions.find(
    (definition) =>
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === "subscription",
  );

  if (!operation || operation.kind !== Kind.OPERATION_DEFINITION) {
    throw new Error("Expected a subscription operation");
  }

  const selection = operation.selectionSet.selections[0];
  if (!selection || selection.kind !== Kind.FIELD) {
    throw new Error("Expected a subscription field selection");
  }

  return selection;
}

function getArgumentValue(args: SubscriptionArgs, names: string[]): string {
  for (const name of names) {
    const value = args[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  throw new Error(`Missing argument: ${names.join(" or ")}`);
}

function tryGetArgumentValue(args: SubscriptionArgs, names: string[]): string | null {
  for (const name of names) {
    const value = args[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  return null;
}

function readArgs(
  argumentNodes: readonly ArgumentNode[] | undefined,
  variables: Record<string, unknown>,
): SubscriptionArgs {
  const args: SubscriptionArgs = {};
  for (const arg of argumentNodes ?? []) {
    args[arg.name.value] = valueFromASTUntyped(arg.value, variables);
  }
  return args;
}

function channelForSubscription(
  field: FieldNode,
  variables: Record<string, unknown>,
): string {
  const args = readArgs(field.arguments, variables);

  switch (field.name.value) {
    case "seatUpdated":
      return `seat:${getArgumentValue(args, ["code", "tableCode"])}`;
    case "activeParticipantsChanged":
      return `active:${getArgumentValue(args, ["activeId"])}`;
    case "notificationReceived":
      return `user:${getArgumentValue(args, ["userId"])}`;
    case "leaderboardUpdated":
      return `leaderboard:${getArgumentValue(args, ["category"])}`;
    case "orderStatusChanged": {
      const oid = tryGetArgumentValue(args, ["orderId"]);
      if (oid) return `order:${oid}`;
      const tid = tryGetArgumentValue(args, ["tableId"]);
      if (tid) return `order-table:${tid}`;
      const sid = tryGetArgumentValue(args, ["storeId"]);
      if (sid) return `order-store:${sid}`;
      return "order:all";
    }
    default:
      throw new Error(`Unsupported subscription field: ${field.name.value}`);
  }
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Type", "text/event-stream");
  headers.set("Cache-Control", "no-cache");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function graphqlStreamHandler(
  c: Context<HonoCtxEnv>,
): Promise<Response> {
  const authUser = await getAuthUser(c);
  const role = resolveRole(authUser);
  if (!hasRole(role, "authenticated")) {
    return c.text("Unauthorized", 401, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  const query = c.req.query("query");
  if (!query) {
    return c.json({ errors: ["Missing query parameter"] }, 400, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  let channel: string;
  try {
    const variables = parseVariables(c.req.query("variables") ?? null);
    const document = parse(query);
    channel = channelForSubscription(
      getFirstSubscriptionField(document),
      variables,
    );
  } catch (error) {
    return c.json(
      {
        errors: [
          error instanceof Error ? error.message : "Invalid subscription",
        ],
      },
      400,
      { "Access-Control-Allow-Origin": "*" },
    );
  }

  const env = c.env as EnvWithPubSub;
  const id = env.PUBSUB.idFromName(channel);
  const stub = env.PUBSUB.get(id);
  const response = await stub.fetch("https://internal/subscribe");
  return withCors(response);
}

export default graphqlStreamHandler;
