import AuthLink from "@/client/components/mail/auth-link";
import { HonoCtxEnv } from "@/shared/types";
import { Context } from "hono";
import ReactDOMServer from "react-dom/server";

export default async function mailPreview(c: Context<HonoCtxEnv>) {
    return c.html(
        ReactDOMServer.renderToStaticMarkup(
            <AuthLink url="https://diceshock.com/auth" />
        )
    );
}
