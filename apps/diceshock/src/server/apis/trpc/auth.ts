import * as $Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $Util from "@alicloud/tea-util";
import { customAlphabet } from "nanoid";
import z from "zod/v4";
import { publicProcedure } from "./baseTRPC";

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
  .input(z.object({ phone: z.string(), botcheck: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const { phone, botcheck } = input;
    const { aliyunClient, env } = ctx;
    const { KV, TURNSTILE_KEY } = env;

    const formData = new FormData();
    formData.append("secret", TURNSTILE_KEY);
    formData.append("response", botcheck);

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

    const code = customAlphabet("0123456789", 6)();

    const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
      templateParam: JSON.stringify({ code }),
      templateCode: "SMS_330260870",
      signName: "武汉市奇兵文化创意",
      phoneNumbers: phone,
    });

    const runtime = new $Util.RuntimeOptions({});

    try {
      const { body: { code } = {} } = await aliyunClient.sendSmsWithOptions(
        sendSmsRequest,
        runtime,
      );

      if (code !== "OK")
        return { success: false, message: "无法发送短信, 请联系管理员" };

      const expirationTtl = 60 * 5;

      await KV.put(`sms_code:${phone}`, code, { expirationTtl });

      return {
        success: true,
        code,
        expiresInMs: expirationTtl * 1000,
      };
    } catch (e) {
      console.error(e);

      return { success: false, message: "服务端错误, 请联系管理员" };
    }
  });

export default { smsCode };
