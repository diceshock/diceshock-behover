// Auto-generated barrel file — merges ALL custom resolvers into the schema
import { activesResolvers, activesTypeDefs } from "./actives";
import { adminResolvers, adminTypeDefs } from "./admin";
import { authResolvers, authTypeDefs } from "./auth";
import { mahjongResolvers, mahjongTypeDefs } from "./mahjong";
import { membershipResolvers, membershipTypeDefs } from "./membership";
import { ordersResolvers, ordersTypeDefs } from "./orders";
import { preferencesResolvers, preferencesTypeDefs } from "./preferences";
import {
  subscriptionResolvers,
  subscriptionTypeDefs,
} from "./subscriptions";
import { tablesResolvers, tablesTypeDefs } from "./tables";
import { usersResolvers, usersTypeDefs } from "./users";
import type { ResolverMap } from "../schema";

export const ALL_RESOLVERS: ResolverMap = {
  ...activesResolvers,
  ...adminResolvers,
  ...authResolvers,
  ...mahjongResolvers,
  ...membershipResolvers,
  ...ordersResolvers,
  ...preferencesResolvers,
  ...subscriptionResolvers,
  ...tablesResolvers,
  ...usersResolvers,
};

export const ALL_TYPEDEFS = [
  activesTypeDefs,
  adminTypeDefs,
  authTypeDefs,
  mahjongTypeDefs,
  membershipTypeDefs,
  ordersTypeDefs,
  preferencesTypeDefs,
  subscriptionTypeDefs,
  tablesTypeDefs,
  usersTypeDefs,
].join("\n");
