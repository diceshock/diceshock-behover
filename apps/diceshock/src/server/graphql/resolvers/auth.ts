import type { AdapterAccountType } from "@auth/core/adapters";
import dbFactory, { accounts, drizzle, userInfoTable, users } from "@lib/db";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { getSmsTmpCodeKey } from "@/server/utils/auth";
import { ADMIN_PHONES_KV_KEY, mergeByPhone } from "@/server/utils/phoneMerge";
import { LOCALES, STORES } from "@/shared/store-locale";
import { generateTOTP, generateTotpSecret } from "@/shared/utils/totp";
import type { GQLContext } from "../context";
import { internalError, notFound, validationError } from "../errors";
import { requireAdmin, requireAuth } from "../guards";
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
    avatarUrl: user.userInfo.avatar_url,
    role: user.role.toUpperCase(),
    nickname: user.userInfo.nickname,
    phone: user.userInfo.phone,
    points: user.userInfo.points ?? 0,
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
    adminPhones: [String!]!
  }

  input AdminPhoneInput {
    phone: String!
    code: String!
  }

  extend type Mutation {
    sendSmsCode(input: SendSmsCodeInput!): SmsCodeResult!
    verifyPhone(input: VerifyPhoneInput!): UserInfoUpdateResult!
    updateProfile(input: UpdateProfileInput!): UserInfoUpdateResult!
    updatePreferences(input: UpdatePreferencesInput!): UserProfile!
    verifyTotp(input: VerifyTotpInput!): TotpVerificationResult!
    addAdminPhone(input: AdminPhoneInput!): [String!]!
    removeAdminPhone(input: AdminPhoneInput!): [String!]!
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
    async adminPhones(
      _source: unknown,
      _args: Record<string, never>,
      ctx: GQLContext,
    ) {
      requireAdmin(ctx);
      const raw = await ctx.env.KV.get(ADMIN_PHONES_KV_KEY);
      if (!raw) return [];
      try {
        return JSON.parse(raw) as string[];
      } catch {
        return [];
      }
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

    async requestSmsCode(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      // No auth required — used during login before user is authenticated
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

      // Update phone on current user's info
      await tdb
        .update(userInfoTable)
        .set({ phone: input.phone })
        .where(drizzle.eq(userInfoTable.id, ctx.userId));

      // Merge any other accounts with the same phone into this user
      // (must happen BEFORE updating the SMS account to avoid unique constraint
      // conflicts when the phone is already another user's providerAccountId)
      const mergeResult = await mergeByPhone(
        ctx.env.DB,
        ctx.env.KV,
        ctx.userId,
        input.phone,
      );

      if (mergeResult.merged) {
        console.log("[verifyPhone:merge]", {
          targetUserId: ctx.userId,
          phone: input.phone,
          mergedUserIds: mergeResult.mergedUserIds,
          finalRole: mergeResult.role,
        });
      }

      // Ensure exactly one SMS account with the new phone exists for this user.
      // After merge, the user may have multiple SMS accounts (old phone + absorbed phone).
      // Strategy: check if the correct one already exists; if so, delete stale ones.
      // If not, upsert it.
      const smsWithNewPhone = await tdb.query.accounts.findFirst({
        where: (account, { and, eq }) =>
          and(
            eq(account.userId, ctx.userId),
            eq(account.provider, "SMS"),
            eq(account.providerAccountId, input.phone),
          ),
      });

      if (smsWithNewPhone) {
        // The correct account exists (likely moved from source user).
        // Delete any OTHER SMS accounts for this user (stale phones).
        await tdb
          .delete(accounts)
          .where(
            drizzle.and(
              drizzle.eq(accounts.userId, ctx.userId),
              drizzle.eq(accounts.provider, "SMS"),
              drizzle.ne(accounts.providerAccountId, input.phone),
            ),
          );
      } else {
        // No SMS account with the new phone. Update existing or insert.
        const anySmS = await tdb.query.accounts.findFirst({
          where: (account, { and, eq }) =>
            and(eq(account.userId, ctx.userId), eq(account.provider, "SMS")),
        });
        if (anySmS) {
          await tdb
            .update(accounts)
            .set({ providerAccountId: input.phone })
            .where(
              drizzle.and(
                drizzle.eq(accounts.userId, ctx.userId),
                drizzle.eq(accounts.provider, "SMS"),
                drizzle.eq(accounts.providerAccountId, anySmS.providerAccountId),
              ),
            );
        } else {
          await tdb
            .insert(accounts)
            .values({
              userId: ctx.userId,
              type: "credentials" as AdapterAccountType,
              provider: "SMS",
              providerAccountId: input.phone,
            })
            .onConflictDoNothing();
        }
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

    async addAdminPhone(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAdmin(ctx);
      const schema = z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        code: z.string().regex(/^\d{6}$/),
      });
      const input = zodToGraphQLError(schema, args.input);

      // Verify SMS code for the phone being added
      const kvKey = getSmsTmpCodeKey(input.phone);
      const storedCode = await ctx.env.KV.get(kvKey);
      if (!storedCode || storedCode !== input.code) {
        throw validationError("code", "SMS code is invalid or expired");
      }
      await ctx.env.KV.delete(kvKey);

      // Add to admin phone list
      const raw = await ctx.env.KV.get(ADMIN_PHONES_KV_KEY);
      const phones: string[] = raw ? JSON.parse(raw) : [];
      if (!phones.includes(input.phone)) {
        phones.push(input.phone);
        await ctx.env.KV.put(ADMIN_PHONES_KV_KEY, JSON.stringify(phones));
      }

      // Upgrade the user with this phone to admin
      const tdb = dbFactory(ctx.env.DB);
      const userWithPhone = await tdb.query.userInfoTable.findFirst({
        where: (ui, { eq }) => eq(ui.phone, input.phone),
        columns: { id: true },
      });
      if (userWithPhone) {
        await tdb
          .update(users)
          .set({ role: "admin" })
          .where(drizzle.eq(users.id, userWithPhone.id));
      }

      return phones;
    },

    async removeAdminPhone(
      _source: unknown,
      args: { input: unknown },
      ctx: GQLContext,
    ) {
      requireAdmin(ctx);
      const schema = z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/),
        code: z.string().regex(/^\d{6}$/),
      });
      const input = zodToGraphQLError(schema, args.input);

      // Verify SMS code for authorization
      const kvKey = getSmsTmpCodeKey(input.phone);
      const storedCode = await ctx.env.KV.get(kvKey);
      if (!storedCode || storedCode !== input.code) {
        throw validationError("code", "SMS code is invalid or expired");
      }
      await ctx.env.KV.delete(kvKey);

      // Remove from admin phone list
      const raw = await ctx.env.KV.get(ADMIN_PHONES_KV_KEY);
      const phones: string[] = raw ? JSON.parse(raw) : [];
      const updated = phones.filter((p) => p !== input.phone);
      await ctx.env.KV.put(ADMIN_PHONES_KV_KEY, JSON.stringify(updated));

      return updated;
    },
  },
};
