import baseSchema from "../../../../schema.graphql?raw";
import type { ResolverMap } from "../schema";
import { activesResolvers } from "./actives";
import { adminResolvers } from "./admin";
import { authResolvers } from "./auth";
import { mahjongResolvers } from "./mahjong";
import { membershipResolvers } from "./membership";
import { ordersResolvers } from "./orders";
import { preferencesResolvers } from "./preferences";
import { subscriptionResolvers } from "./subscriptions";
import { tablesResolvers } from "./tables";
import { usersResolvers } from "./users";

export const ALL_RESOLVERS: ResolverMap = {
  ...(activesResolvers as ResolverMap),
  ...(adminResolvers as ResolverMap),
  ...(authResolvers as ResolverMap),
  ...(mahjongResolvers as ResolverMap),
  ...(membershipResolvers as ResolverMap),
  ...(ordersResolvers as ResolverMap),
  ...(preferencesResolvers as ResolverMap),
  ...(subscriptionResolvers as ResolverMap),
  ...(tablesResolvers as ResolverMap),
  ...(usersResolvers as ResolverMap),
};

export const ALL_TYPEDEFS = baseSchema;
