import type { GraphQLSchemaWithContext } from "@graphql-tools/schema";
import { RenameRootFields, wrapSchema } from "@graphql-tools/wrap";
import { z } from "zod";
import { FACTORY } from "../factory";
import { injectCrossDataToCtx } from "../utils";

const browserZ = z.enum([
  "chrome",
  "edge",
  "firefox",
  "safari",
  "opera",
  "other",
  "unknown",
]);

const osZ = z.enum([
  "windows",
  "mac",
  "linux",
  "android",
  "ios",
  "other",
  "unknown",
]);

export const userAgentMetaZ = z.object({
  os: osZ,
  browser: browserZ,
  language: z.string(),
  userAgent: z.string(),
  ip: z.string(),
  timestamp: z.number(),
});

export type Browser = z.infer<typeof browserZ>;
export type OperatingSystem = z.infer<typeof osZ>;
export type UserAgentMeta = z.infer<typeof userAgentMetaZ>;

export function parseBrowserFromUserAgent(userAgent: string): Browser {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();

  if (ua.includes("edg/")) return "edge";
  if (ua.includes("chrome/") && !ua.includes("edg/")) return "chrome";
  if (ua.includes("firefox/")) return "firefox";
  if (ua.includes("safari/") && !ua.includes("chrome/")) return "safari";
  if (ua.includes("opera/") || ua.includes("opr/")) return "opera";

  return "other";
}

export function parseOSFromUserAgent(userAgent: string): OperatingSystem {
  if (!userAgent) return "unknown";

  const ua = userAgent.toLowerCase();

  if (ua.includes("windows nt")) return "windows";
  if (ua.includes("mac os x") || ua.includes("macintosh")) return "mac";
  if (ua.includes("linux")) return "linux";
  if (ua.includes("android")) return "android";
  if (ua.includes("iphone") || ua.includes("ipad")) return "ios";

  return "other";
}

export function parseLanguage(acceptLanguage: string): string {
  if (!acceptLanguage) return "unknown";

  const languages = acceptLanguage
    .split(",")
    .map((lang) => lang.split(";").at(0)?.trim() ?? "")
    .filter((lang) => lang.length > 0);

  return languages.at(0) || "unknown";
}

export function wrapSchemaWithNamespace<C>(
  schema: GraphQLSchemaWithContext<C>,
  ns: string,
) {
  return wrapSchema({
    schema,
    transforms: [
      new RenameRootFields((_op, name) => {
        return `${ns}_${name}`;
      }),
    ],
  });
}

export function parseUserAgentMeta(
  userAgent?: string,
  acceptLanguage?: string,
  ip?: string,
): UserAgentMeta {
  const meta = {
    os: userAgent ? parseOSFromUserAgent(userAgent) : "unknown",
    browser: userAgent ? parseBrowserFromUserAgent(userAgent) : "unknown",
    language: acceptLanguage ? parseLanguage(acceptLanguage) : "unknown",
    userAgent: userAgent || "unknown",
    ip: ip || "unknown",
    timestamp: Date.now(),
  };

  return userAgentMetaZ.parse(meta);
}

export function safeParseUserAgentMeta(
  userAgent: string,
  acceptLanguage: string,
  ip?: string,
):
  | { success: true; data: UserAgentMeta }
  | { success: false; error: z.ZodError } {
  try {
    const meta = {
      os: parseOSFromUserAgent(userAgent),
      browser: parseBrowserFromUserAgent(userAgent),
      language: parseLanguage(acceptLanguage),
      userAgent: userAgent,
      ip: ip || "unknown",
      timestamp: Date.now(),
    };

    const result = userAgentMetaZ.safeParse(meta);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          message: "Unexpected error during parsing",
          path: [],
        },
      ]),
    };
  }
}

const BLACK_LIST = [/^\/api/, /^\/edge/];

const serverMetaInj = FACTORY.createMiddleware(async (c, next) => {
  if (BLACK_LIST.some((re) => re.test(c.req.path))) return await next();

  const userAgent = c.req.header("user-agent");
  const acceptLanguage = c.req.header("accept-language");
  const ip = c.req.header("cf-connecting-ip");

  const UserAgentMeta = parseUserAgentMeta(userAgent, acceptLanguage, ip);

  injectCrossDataToCtx(c, { UserAgentMeta });

  return await next();
});

export default serverMetaInj;
