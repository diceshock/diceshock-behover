import * as $Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $Util from "@alicloud/tea-util";
import { customAlphabet } from "nanoid";
import z from "zod/v4";
import { publicProcedure } from "./baseTRPC";

const smsCode = publicProcedure
  .input(z.object({ phone: z.string() }))
  .mutation(async ({ input, ctx }) => {
    const { phone } = input;
    const { aliyunClient, env } = ctx;
    const { KV } = env;

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
