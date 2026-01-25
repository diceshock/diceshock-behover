import * as $Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $Util from "@alicloud/tea-util";
import db, { accounts, drizzle, userInfoTable } from "@lib/db";
import { customAlphabet } from "nanoid";
import z from "zod/v4";
import { getSmsTmpCodeKey } from "@/server/utils/auth";
import { protectedProcedure, publicProcedure } from "./baseTRPC";

export interface TurnstileResponse {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  "error-codes": any[];
  action: string;
  cdata: string;
  metadata: {
    ephemeral_id: string;
  };
}

const smsCode = publicProcedure
  .input(z.object({ phone: z.string(), botcheck: z.string().nullable() }))
  .mutation(async ({ input, ctx }) => {
    const { phone, botcheck } = input;
    const { aliyunClient, env } = ctx;
    const { KV, TURNSTILE_KEY } = env;

    const formData = new FormData();
    formData.append("secret", TURNSTILE_KEY);
    formData.append("response", botcheck ?? "");

    if (import.meta.env.PROD) {
      try {
        const response = await fetch(
          "https://challenges.cloudflare.com/turnstile/v0/siteverify",
          {
            method: "POST",
            body: formData,
          },
        );

        const result: TurnstileResponse = await response.json();

        if (!result.success)
          return { success: false, message: "Turnstile 验证失败, 请稍后重试" };
      } catch (error) {
        console.error("Turnstile validation error:", error);
        return { success: false, message: "Turnstile 验证失败, 请稍后重试" };
      }
    }

    // 检查手机号是否已注册（被其他用户使用）
    // 注意：如果是当前用户正在修改手机号，这里不需要检查是否已注册（除非我们限制一个手机号只能注册一次，通常是的）
    // 但是这里是发送验证码，我们通常允许发送验证码，但在绑定时检查是否冲突
    // 之前的逻辑是：如果是登录/注册流程，如果手机号已存在，返回错误（让用户直接登录）
    // 但是这里复用了 smsCode 接口。如果用户在修改手机号，输入的手机号可能还没注册。
    // 如果输入的手机号已经注册了，这里会返回错误，这对于修改手机号来说是合理的：不能修改为一个已注册的手机号。

    // 但是，原来的逻辑是：
    /*
    if (existingAccount) {
      return {
        success: false,
        message: "该手机号已注册，请直接登录",
      };
    }
    */
    // 这对于登录流程是好的。对于修改手机号流程，如果手机号已注册，确实不能修改为该手机号。
    // 但是提示语 "请直接登录" 可能不太合适。不过暂时可以接受，或者前端处理错误信息。

    const tdb = db(env.DB);
    const existingAccount = await tdb.query.accounts.findFirst({
      where: (acc: any, { eq, and }: any) =>
        and(eq(acc.provider, "SMS"), eq(acc.providerAccountId, phone)),
    });

    if (existingAccount) {
      return {
        success: false,
        message: "该手机号已注册",
      };
    }

    const verificationCode = customAlphabet("0123456789", 6)();

    const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
      templateParam: JSON.stringify({ code: verificationCode }),
      templateCode: "SMS_330260870",
      signName: "武汉市奇兵文化创意",
      phoneNumbers: phone,
    });

    const runtime = new $Util.RuntimeOptions({});

    try {
      const response = await aliyunClient.sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );

      const responseCode = response.body?.code;

      if (responseCode !== "OK") {
        console.error({
          type: "SMS_SEND_FAILED",
          phone,
          responseCode,
          responseBody: response.body,
          templateCode: sendSmsRequest.templateCode,
        });

        // 根据错误码返回不同的错误信息
        let errorMessage = "无法发送短信, 请联系管理员";
        if (responseCode === "isv.MOBILE_NUMBER_ILLEGAL") {
          errorMessage = "手机号码格式错误，请检查后重试";
        } else if (responseCode === "isv.BUSINESS_LIMIT_CONTROL") {
          errorMessage = "发送次数过多，请稍后再试";
        }

        return { success: false, message: errorMessage };
      }

      const expirationTtl = 60 * 5;
      const kvKey = getSmsTmpCodeKey(phone);

      await KV.put(kvKey, verificationCode, { expirationTtl });

      console.log({
        type: "SMS_SENT_SUCCESS",
        phone,
        kvKey,
        expirationTtl,
      });

      return {
        success: true,
        code: verificationCode,
        expiresInMs: expirationTtl * 1000,
      };
    } catch (e) {
      console.error({
        type: "SMS_SERVICE_ERROR",
        errorType: e?.constructor?.name || "Unknown",
        errorMessage: e instanceof Error ? e.message : String(e),
        errorStack: e instanceof Error ? e.stack : undefined,
        context: {
          phone,
          templateCode: sendSmsRequest.templateCode,
          signName: sendSmsRequest.signName,
          phoneNumbers: sendSmsRequest.phoneNumbers,
        },
        errorDetails:
          e instanceof Error
            ? {
                name: e.name,
                message: e.message,
                stack: e.stack,
              }
            : String(e),
      });

      return { success: false, message: "服务端错误, 请联系管理员" };
    }
  });

const updateUserInfo = protectedProcedure
  .input(
    z.object({
      nickname: z.string().optional(),
      phone: z.string().optional(),
      code: z.string().optional(),
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { userId, env } = ctx;
    const { KV } = env;

    if (!userId) {
      return { success: false, message: "用户未登录" };
    }

    // 如果没有提供任何字段，直接返回
    if (input.nickname === undefined && input.phone === undefined) {
      return { success: false, message: "没有需要更新的字段" };
    }

    const tdb = db(env.DB);
    const updateData: {
      nickname?: string;
      phone?: string | null;
    } = {};

    // 处理 nickname 更新
    if (input.nickname !== undefined) {
      // 验证 nickname 不能为空
      if (!input.nickname.trim()) {
        return { success: false, message: "昵称不能为空" };
      }
      updateData.nickname = input.nickname.trim();
    }

    // 处理 phone 更新
    if (input.phone !== undefined) {
      const trimmedPhone = input.phone.trim();

      // 如果提供了手机号，必须提供验证码
      if (trimmedPhone && !input.code) {
        return { success: false, message: "修改手机号需要提供验证码" };
      }

      // 如果提供了验证码，验证验证码
      if (input.code) {
        const smsCode = await KV.get(getSmsTmpCodeKey(trimmedPhone));
        if (smsCode !== input.code) {
          return { success: false, message: "验证码错误或已过期" };
        }

        // 检查新手机号是否已被占用
        const existingAccount = await tdb.query.accounts.findFirst({
          where: (acc: any, { eq, and }: any) =>
            and(
              eq(acc.provider, "SMS"),
              eq(acc.providerAccountId, trimmedPhone),
            ),
        });

        if (existingAccount && existingAccount.userId !== userId) {
          return { success: false, message: "该手机号已被其他账号使用" };
        }

        // 清除验证码
        await KV.delete(getSmsTmpCodeKey(trimmedPhone));
      }

      updateData.phone = trimmedPhone || null;

      // 更新或创建 accounts 表记录
      const currentUserAccount = await tdb.query.accounts.findFirst({
        where: (acc: any, { eq, and }: any) =>
          and(eq(acc.userId, userId), eq(acc.provider, "SMS")),
      });

      if (trimmedPhone) {
        if (currentUserAccount) {
          // 更新现有账号
          await tdb
            .update(accounts)
            .set({ providerAccountId: trimmedPhone })
            .where(
              (drizzle as any).and(
                (drizzle as any).eq(accounts.userId, userId),
                (drizzle as any).eq(accounts.provider, "SMS"),
              ),
            );
        } else {
          // 创建新账号
          await tdb.insert(accounts).values({
            userId,
            type: "credentials" as any,
            provider: "SMS",
            providerAccountId: trimmedPhone,
          });
        }
      } else if (currentUserAccount) {
        // 如果手机号为空且存在账户，删除账户
        await tdb
          .delete(accounts)
          .where(
            (drizzle as any).and(
              (drizzle as any).eq(accounts.userId, userId),
              (drizzle as any).eq(accounts.provider, "SMS"),
            ),
          );
      }
    }

    try {
      // 更新 userInfo 表
      const [updatedUserInfo] = await tdb
        .update(userInfoTable)
        .set(updateData)
        .where((drizzle as any).eq(userInfoTable.id, userId))
        .returning();

      if (!updatedUserInfo) {
        return { success: false, message: "用户信息不存在" };
      }

      return {
        success: true,
        data: {
          uid: updatedUserInfo.uid,
          nickname: updatedUserInfo.nickname,
          phone: updatedUserInfo.phone,
        },
      };
    } catch (error) {
      console.error("更新用户信息失败:", error);
      return {
        success: false,
        message: "更新用户信息失败, 请稍后重试",
      };
    }
  });

export default { smsCode, updateUserInfo };
