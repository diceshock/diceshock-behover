import { Context } from "hono";
import { initAuthConfig } from "@hono/auth-js";

import { D1Adapter, up } from "@auth/d1-adapter";
import GitHub from "@auth/core/providers/github";
import Resend from "@auth/core/providers/resend";

import { HonoCtxEnv } from "@/shared/types";
import getSendVerificationRequest from "./sendMail";

let migrated = false;

const initAuth = initAuthConfig(async (ctx) => {
    const c = ctx as Context<HonoCtxEnv>;

    if (!migrated) {
        try {
            await up(c.env.DB);
            migrated = true;
        } catch (e) {
            if (e instanceof Error) console.log(e.message);
        }
    }

    return {
        secret: c.env.AUTH_SECRET,
        adapter: D1Adapter(c.env.DB),
        pages: {
            signIn: "/auth",
            verifyRequest: "/mail-send",
        },
        providers: [
            GitHub({
                clientId: c.env.GITHUB_ID,
                clientSecret: c.env.GITHUB_SECRET,
            }),
            Resend({
                apiKey: c.env.AUTH_RESEND_KEY,
                from: c.env.EMAIL_FROM,
                sendVerificationRequest: getSendVerificationRequest(c),
            }),
        ],
    };
});

export default initAuth;
