import z from "zod/v4";
import { publicProcedure, staffProcedure } from "./baseTRPC";

const KV_KEY_CAPTCHA_DISABLED_UNTIL = "settings:captcha_disabled_until";
const CAPTCHA_DISABLE_TTL = 60 * 60 * 2;

const getCaptchaEnabled = publicProcedure.query(async ({ ctx }) => {
  const disabledUntil = await ctx.env.KV.get(KV_KEY_CAPTCHA_DISABLED_UNTIL);
  if (!disabledUntil) return { enabled: true, disabledUntil: null };
  return { enabled: false, disabledUntil: Number(disabledUntil) };
});

const setCaptchaEnabled = staffProcedure
  .input(z.object({ enabled: z.boolean() }))
  .mutation(async ({ input, ctx }) => {
    if (input.enabled) {
      await ctx.env.KV.delete(KV_KEY_CAPTCHA_DISABLED_UNTIL);
      return { success: true, enabled: true, disabledUntil: null };
    }

    const disabledUntil = Date.now() + CAPTCHA_DISABLE_TTL * 1000;
    await ctx.env.KV.put(KV_KEY_CAPTCHA_DISABLED_UNTIL, String(disabledUntil), {
      expirationTtl: CAPTCHA_DISABLE_TTL,
    });
    return { success: true, enabled: false, disabledUntil };
  });

const getWechatOpenConfig = publicProcedure.query(async ({ ctx }) => {
  const appId = ctx.env.WECHAT_OPEN_APP_ID || null;
  return { appId };
});

export default { getCaptchaEnabled, setCaptchaEnabled, getWechatOpenConfig };
