import z from "zod/v4";
import { dashProcedure, publicProcedure } from "./baseTRPC";

const KV_KEY_CAPTCHA_DISABLED_UNTIL = "settings:captcha_disabled_until";
const CAPTCHA_DISABLE_TTL = 60 * 60 * 2;

const getCaptchaEnabled = publicProcedure.query(async ({ ctx }) => {
  const disabledUntil = await ctx.env.KV.get(KV_KEY_CAPTCHA_DISABLED_UNTIL);
  if (!disabledUntil) return { enabled: true, disabledUntil: null };
  return { enabled: false, disabledUntil: Number(disabledUntil) };
});

const setCaptchaEnabled = dashProcedure
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

export default { getCaptchaEnabled, setCaptchaEnabled };
