/*global NodeJS */

import type Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import type { Env } from "hono";
import z from "zod/v4";
import { userInfoZ } from "@/server/middlewares/auth";
import { userAgentMetaZ } from "@/server/middlewares/serverMetaInj";

export const injectCrossDataZ = z.object({
  UserAgentMeta: userAgentMetaZ.optional(),
  UserInfo: userInfoZ.optional(),
  StoreCode: z.string().optional(),
  LocaleCode: z.string().optional(),
  RequestId: z.string(),
});
export type InjectCrossData = z.infer<typeof injectCrossDataZ>;

export interface HonoCtxEnv extends Env {
  Bindings: Cloudflare.Env;
  Variables: {
    InjectCrossData?: InjectCrossData;
    AliyunClient?: Dysmsapi20170525;
    StoreCode?: string;
    LocaleCode?: string;
  };
}

export interface TempIdentityData {
  kind: "temp";
  tempId: string;
  nickname: string;
  totpSecret: string;
  expiresAt: number;
}

export interface RealIdentityData {
  kind: "real";
  uid: string;
  nickname: string;
  phone: string | null;
}

export type SeatIdentity = TempIdentityData | RealIdentityData;
