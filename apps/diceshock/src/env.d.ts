/**
 * Secret bindings not captured by `wrangler types`.
 * These are set via `wrangler secret put` and live only in Workers runtime.
 */
interface __SecretBindings {
  AUTH_SECRET: string;
  WECHAT_MP_APP_ID: string;
  WECHAT_MP_APP_SECRET: string;
  WECHAT_MP_TOKEN: string;
  WECHAT_MP_ENCODING_AES_KEY: string;
  WECHAT_OPEN_APP_ID: string;
  WECHAT_OPEN_APP_SECRET: string;
  CF_ACCOUNT_ID: string;
  CF_AI_GATEWAY_ID: string;
  ALIBABA_CLOUD_ACCESS_KEY_ID: string;
  ALIBABA_CLOUD_ACCESS_KEY_SECRET: string;
  /** Guanshizhang API token */
  GSZ_TOKEN: string;
  /** Mem0 memory API key */
  MEM0_API_KEY: string;
}

declare namespace Cloudflare {
  interface Env extends __SecretBindings {}
}

// Global Env (used by most server code) picks up the same secrets.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Env extends __SecretBindings {}
