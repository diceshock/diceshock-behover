import type dbFactory from "@lib/db";
import type { HonoCtxEnv } from "@/shared/types";
import type { AuthContext, Role } from "../apis/wechat/graphql/permissions";

export interface GQLContext extends AuthContext {
  db: ReturnType<typeof dbFactory>;
  role: Role;
  userId: string | null;
  preferredStoreId: string | null;
  env: HonoCtxEnv["Bindings"];
}
