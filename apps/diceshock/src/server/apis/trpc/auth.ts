import * as $Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $Util from "@alicloud/tea-util";
import db, { drizzle, userInfoTable } from "@lib/db";
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
        return { success: false, message: "无法发送短信, 请联系管理员" };
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
    }),
  )
  .mutation(async ({ input, ctx }) => {
    const { userId, env } = ctx;

    if (!userId) {
      return { success: false, message: "用户未登录" };
    }

    // 如果没有提供 nickname，直接返回
    if (input.nickname === undefined) {
      return { success: false, message: "没有需要更新的字段" };
    }

    // 验证 nickname 不能为空
    if (!input.nickname.trim()) {
      return { success: false, message: "昵称不能为空" };
    }

    // 构建更新对象
    const updateData = {
      nickname: input.nickname.trim(),
    };

    try {
      const tdb = db(env.DB);
      const [updatedUserInfo] = await tdb
        .update(userInfoTable)
        .set(updateData)
        .where(drizzle.eq(userInfoTable.id, userId))
        .returning();

      if (!updatedUserInfo) {
        return { success: false, message: "用户信息不存在" };
      }

      return {
        success: true,
        data: {
          uid: updatedUserInfo.uid,
          nickname: updatedUserInfo.nickname,
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
