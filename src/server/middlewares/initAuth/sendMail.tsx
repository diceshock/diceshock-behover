import { HonoCtxEnv } from "@/shared/types";
import { Context } from "hono";
import ReactDOMServer from "react-dom/server";
import AuthLink from "@/client/components/mail/auth-link";
import Resend from "@auth/core/providers/resend";

const getSendVerificationRequest: (
    c: Context<HonoCtxEnv>
) => Parameters<typeof Resend>[0]["sendVerificationRequest"] =
    (c) =>
    async ({ identifier: to, provider, url }) => {
        const { host } = new URL(c.req.url);

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${provider.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: provider.from,
                to,
                subject: `验证邮箱 | ${host}`,
                html: ReactDOMServer.renderToStaticMarkup(
                    <AuthLink url={url} />
                ),
            }),
        });

        if (!res.ok)
            throw new Error(
                "Resend error: " + JSON.stringify(await res.json())
            );
    };

export default getSendVerificationRequest;
