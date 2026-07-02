/**
 * Worker secrets absent from auto-generated worker-configuration.d.ts.
 * Merges into Cloudflare.Env so c.env resolves with concrete bindings.
 */
interface __BaseEnv_CloudflareBindings {
  KV: KVNamespace;
  R2: R2Bucket;
  DB: D1Database;
  GSTONE_DB: D1Database;
  AI_SEARCH: AiSearchInstance;
  WECHAT_AGENT: DurableObjectNamespace<import("../server/durableObjects/WechatAgentDO").WechatAgentDO>;
  WECHAT_MP_TOKEN: string;
  WECHAT_MP_APP_ID: string;
  WECHAT_MP_APP_SECRET: string;
  WECHAT_MP_ENCODING_AES_KEY: string;
  WECHAT_OPEN_APP_ID: string;
  WECHAT_OPEN_APP_SECRET: string;
  DEEPSEEK_API_KEY: string;
  CF_AI_GATEWAY_ID: string;
  GSZ_TOKEN: string;
  CF_ACCOUNT_ID: string;
  AUTH_SECRET: string;
  ALIBABA_CLOUD_ACCESS_KEY_ID: string;
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
  CAPTCHA_PREFIX: string;
  DEV_SMS_CODE: string;
  MEM0_API_KEY: string;
}
