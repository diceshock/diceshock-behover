import type { AdapterAccountType } from "@auth/core/adapters";
import dbFactory, { accounts, drizzle, userInfoTable } from "@lib/db";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { getSmsTmpCodeKey } from "@/server/utils/auth";
import { mergeAccounts } from "@/server/utils/mergeAccounts";
import { LOCALES, STORES } from "@/shared/store-locale";
import { generateTOTP, generateTotpSecret } from "@/shared/utils/totp";
import type { GQLContext } from "../context";
import { internalError, notFound, validationError } from "../errors";
import { requireAuth, requirePhoneBound } from "../guards";
import { zodToGraphQLError } from "../validate";

const smsCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "Invalid phone number format"),
  botcheck: z.string().nullable().optional(),
});

const verifyPhoneSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, "Invalid phone number format"),
  code: z.string().regex(/^\d{6}$/, "SMS code must be 6 digits"),
});

const updateProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(30),
});

const updatePreferencesSchema = z.object({
  preferredLocale: z
    .string()
    .nullable()
    .optional()
    .refine((value) => value == null || value in LOCALES, "Invalid locale"),
  preferredStoreId: z
    .string()
    .nullable()
    .optional()
    .refine((value) => value == null || value in STORES, "Invalid store"),
});

const verifyTotpSchema = z.object({
  totp: z.string().regex(/^\d{6}$/, "TOTP code must be 6 digits"),
  userAgent: z.string().optional(),
  loginTime: z.number().optional(),
});

type AliyunClient = {
  sendSmsWithOptions: (
    request: unknown,
    runtime: Record<string, unknown>,
  ) => Promise<{ body?: { code?: string } }>;
};

function getAliyunClient(ctx: GQLContext): AliyunClient | null {
  const env = ctx.env as GQLContext["env"] & {
    aliyunClient?: unknown;
    AliyunClient?: unknown;
  };
  return (env.aliyunClient ?? env.AliyunClient ?? null) as AliyunClient | null;
}

function toIsoString(value: Date | number | string | null | undefined) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number") return new Date(value).toISOString();
  return value;
}

async function getUserProfile(ctx: GQLContext, userId: string) {
  const tdb = dbFactory(ctx.env.DB);
  const user = await tdb.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, userId),
    with: { userInfo: true, membershipPlans: true },
  });

  if (!user || !user.userInfo) {
    throw notFound("User profile not found");
  }

  return {
    id: user.id,
    uid: user.userInfo.uid,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role.toUpperCase(),
    nickname: user.userInfo.nickname,
    phone: user.userInfo.phone,
    preferredLocale: user.userInfo.preferred_locale,
    preferredStoreId: user.userInfo.preferred_store_id,
    meta: user.userInfo.meta ? JSON.stringify(user.userInfo.meta) : null,
    createdAt: toIsoString(user.userInfo.create_at),
    membershipPlans: (user.membershipPlans ?? []).map((plan) => ({
      id: plan.id,
      userId: plan.user_id,
      planType: plan.plan_type.toUpperCase(),
      amount: plan.amount,
      note: plan.note,
      startDate: toIsoString(plan.start_date),
      endDate: toIsoString(plan.end_date),
      createdAt: toIsoString(plan.create_at),
      updatedAt: toIsoString(plan.update_at),
    })),
  };
}

async function sendSms(phone: string, code: string, ctx: GQLContext) {
  const client = getAliyunClient(ctx);
  if (!client) {
    throw internalError("SMS service is not configured");
  }

  const { SendSmsRequest } = await import("@alicloud/dysmsapi20170525");
  const request = new SendSmsRequest({
    phoneNumbers: phone,
    signName: "武汉市奇兵文化创意",
    templateCode: "SMS_330260870",
    templateParam: JSON.stringify({ code }),
  });

  const response = await client.sendSmsWithOptions(request, {});
  const responseCode = response.body?.code;
  if (responseCode === "OK") return;
  if (responseCode === "isv.MOBILE_NUMBER_ILLEGAL") {
    throw validationError("phone", "Invalid phone number format");
  }
  if (responseCode === "isv.BUSINESS_LIMIT_CONTROL") {
    throw validationError("phone", "Too many SMS requests, please try later");
  }
  throw internalError("Unable to send SMS code");
}

function totpOtpAuthUrl(userId: string, secret: string) {
  const issuer = "Diceshock";
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(userId)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}`;
}

export const authTypeDefs = `
  input SendSmsCodeInput {
    phone: String!
    botcheck: String
  }

  input VerifyPhoneInput {
    phone: String!
    code: String!
  }

  input UpdateProfileInput {
    nickname: String!
  }

  extend type TotpSecretResult {
    qrUrl: String
  }

  extend type Query {
    totpSecret: TotpSecretResult!
  }

  extend type Mutation {
    sendSmsCode(input: SendSmsCodeInput!): SmsCodeResult!
    verifyPhone(input: VerifyPhoneInput!): UserInfoUpdateResult!
    updateProfile(input: UpdateProfileInput!): UserInfoUpdateResult!
    updatePreferences(input: UpdatePreferencesInput!): UserProfile!
    verifyTotp(input: VerifyTotpInput!): TotpVerificationResult!
  }
`;

export const authResolvers = {
  Query: {
    async totpSecret(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireAuth(ctx);

      const kvKey = `totp_secret:${ctx.userId}`;
      const existing = await ctx.env.KV.get(kvKey);
      const secret = existing ?? generateTotpSecret();
      if (!existing) {
        await ctx.env.KV.put(kvKey, secret);
      }

      return {
        success: true,
        secret,
        qrUrl: totpOtpAuthUrl(ctx.userId, secret),
      };
    },
  },
  Mutation: {
    async sendSmsCode(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(smsCodeSchema, args.input);
      const expirationTtl = 60 * 5;
      const devSmsCode = (ctx.env as { DEV_SMS_CODE?: string }).DEV_SMS_CODE;
      const verificationCode = devSmsCode || customAlphabet("0123456789", 6)();

      if (!devSmsCode) {
        await sendSms(input.phone, verificationCode, ctx);
      }

      await ctx.env.KV.put(getSmsTmpCodeKey(input.phone), verificationCode, {
        expirationTtl,
      });

      return { success: true, expiresInMs: expirationTtl * 1000 };
    },

    async verifyPhone(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(verifyPhoneSchema, args.input);
      const kvKey = getSmsTmpCodeKey(input.phone);
      const storedCode = await ctx.env.KV.get(kvKey);
      if (!storedCode || storedCode !== input.code) {
        throw validationError("code", "SMS code is invalid or expired");
      }

      const tdb = dbFactory(ctx.env.DB);
      const existingAccount = await tdb.query.accounts.findFirst({
        where: (account, { and, eq }) =>
          and(
            eq(account.provider, "SMS"),
            eq(account.providerAccountId, input.phone),
          ),
      });
      if (existingAccount && existingAccount.userId !== ctx.userId) {
        await mergeAccounts(tdb, ctx.userId, existingAccount.userId);
        await ctx.env.KV.delete(kvKey);
        return {
          success: true,
          merged: true,
          mergedUserId: existingAccount.userId,
          user: await getUserProfile(ctx, existingAccount.userId),
        };
      }

      const existingUserInfo = await tdb.query.userInfoTable.findFirst({
        where: (userInfo, { and, eq, not }) =>
          and(
            eq(userInfo.phone, input.phone),
            not(eq(userInfo.id, ctx.userId)),
          ),
      });
      if (existingUserInfo) {
        await mergeAccounts(tdb, ctx.userId, existingUserInfo.id);
        await ctx.env.KV.delete(kvKey);
        return {
          success: true,
          merged: true,
          mergedUserId: existingUserInfo.id,
          user: await getUserProfile(ctx, existingUserInfo.id),
        };
      }

      await tdb
        .update(userInfoTable)
        .set({ phone: input.phone })
        .where(drizzle.eq(userInfoTable.id, ctx.userId));

      const currentAccount = await tdb.query.accounts.findFirst({
        where: (account, { and, eq }) =>
          and(eq(account.userId, ctx.userId), eq(account.provider, "SMS")),
      });

      if (currentAccount) {
        await tdb
          .update(accounts)
          .set({ providerAccountId: input.phone })
          .where(
            drizzle.and(
              drizzle.eq(accounts.userId, ctx.userId),
              drizzle.eq(accounts.provider, "SMS"),
            ),
          );
      } else {
        await tdb.insert(accounts).values({
          userId: ctx.userId,
          type: "credentials" as AdapterAccountType,
          provider: "SMS",
          providerAccountId: input.phone,
        });
      }

      await ctx.env.KV.delete(kvKey);
      return { success: true, user: await getUserProfile(ctx, ctx.userId) };
    },

    async updateProfile(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      requirePhoneBound(ctx);
      const input = zodToGraphQLError(updateProfileSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);
      const [updated] = await tdb
        .update(userInfoTable)
        .set({ nickname: input.nickname, meta: null })
        .where(drizzle.eq(userInfoTable.id, ctx.userId))
        .returning();

      if (!updated) {
        throw notFound("User profile not found");
      }

      return { success: true, user: await getUserProfile(ctx, ctx.userId) };
    },

    async updatePreferences(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      requirePhoneBound(ctx);
      const input = zodToGraphQLError(updatePreferencesSchema, args.input);
      const tdb = dbFactory(ctx.env.DB);
      const [updated] = await tdb
        .update(userInfoTable)
        .set({
          preferred_locale: input.preferredLocale ?? null,
          preferred_store_id: input.preferredStoreId ?? null,
        })
        .where(drizzle.eq(userInfoTable.id, ctx.userId))
        .returning();

      if (!updated) {
        throw notFound("User profile not found");
      }

      return getUserProfile(ctx, ctx.userId);
    },

    async verifyTotp(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAuth(ctx);
      const input = zodToGraphQLError(verifyTotpSchema, args.input);
      const secret = await ctx.env.KV.get(`totp_secret:${ctx.userId}`);
      if (!secret) {
        throw validationError("totp", "TOTP secret has not been generated");
      }

      const now = Date.now();
      const currentCode = await generateTOTP(secret, 30, 6, now);
      const previousCode = await generateTOTP(secret, 30, 6, now - 30_000);
      if (input.totp !== currentCode && input.totp !== previousCode) {
        throw validationError("totp", "TOTP code is invalid or expired");
      }

      return { success: true, userId: ctx.userId };
    },
  },
};
