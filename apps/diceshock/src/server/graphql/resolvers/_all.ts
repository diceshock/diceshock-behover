import baseSchema from "../../../../schema.graphql?raw";
import type { ResolverMap } from "../schema";
import { activesResolvers } from "./actives";
import { adminResolvers } from "./admin";
import { authResolvers } from "./auth";
import { mahjongResolvers } from "./mahjong";
import { membershipResolvers } from "./membership";
import { ordersResolvers } from "./orders";
import { pointsResolvers } from "./points";
import { preferencesResolvers } from "./preferences";
import { subscriptionResolvers } from "./subscriptions";
import { tablesResolvers } from "./tables";
import { usersResolvers } from "./users";

function mergeResolverMaps(
  ...maps: Record<string, Record<string, unknown>>[]
): ResolverMap {
  const result: Record<string, Record<string, unknown>> = {};
  for (const map of maps) {
    for (const [typeName, fields] of Object.entries(map)) {
      if (!result[typeName]) result[typeName] = {};
      Object.assign(result[typeName], fields);
    }
  }
  return result as ResolverMap;
}

export const ALL_RESOLVERS: ResolverMap = mergeResolverMaps(
  activesResolvers as Record<string, Record<string, unknown>>,
  adminResolvers as Record<string, Record<string, unknown>>,
  authResolvers as Record<string, Record<string, unknown>>,
  mahjongResolvers as Record<string, Record<string, unknown>>,
  membershipResolvers as Record<string, Record<string, unknown>>,
  ordersResolvers as Record<string, Record<string, unknown>>,
  pointsResolvers as Record<string, Record<string, unknown>>,
  preferencesResolvers as Record<string, Record<string, unknown>>,
  subscriptionResolvers as Record<string, Record<string, unknown>>,
  tablesResolvers as Record<string, Record<string, unknown>>,
  usersResolvers as Record<string, Record<string, unknown>>,
);

export const ALL_TYPEDEFS = baseSchema;
