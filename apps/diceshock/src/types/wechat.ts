/**
 * Raw WeChat OAuth token endpoint response.
 * Fields correspond to the actual access patterns in providers/wechat.ts:
 * - data.errcode, data.errmsg (error handling, line 51-55)
 * - data.access_token, data.expires_in, data.refresh_token, data.scope, data.openid (line 63-68)
 */
export interface WechatOAuthTokenResponse {
  /** Error code; 0 or absent on success */
  errcode?: number;
  /** Error message (Chinese) */
  errmsg?: string;
  /** OAuth access token */
  access_token: string;
  /** Token lifetime in seconds (typically 7200) */
  expires_in: number;
  /** Token used to refresh the access token */
  refresh_token: string;
  /** Authorized scope (e.g., "snsapi_login", "snsapi_userinfo") */
  scope: string;
  /** WeChat user's unique OpenID for this application */
  openid: string;
  /** WeChat user's UnionID (only available when application is bound to WeChat Open Platform) */
  unionid?: string;
}

/**
 * Raw WeChat userinfo endpoint response.
 * Fields correspond to the actual access patterns in providers/wechat.ts
 * (line 48: data fields passed as WechatProfile) and middleware/auth.ts
 * (line 104: profile.unionid, line 157/159: profile.nickname).
 */
export interface WechatUserInfoResponse {
  /** Error code; 0 or absent on success */
  errcode?: number;
  /** Error message (Chinese) */
  errmsg?: string;
  /** User's OpenID */
  openid: string;
  /** User's display name */
  nickname: string;
  /** Gender: 1 = male, 2 = female, 0 = unknown */
  sex: number;
  /** Province */
  province: string;
  /** City */
  city: string;
  /** Country */
  country: string;
  /** Avatar URL (up to 132px; replace /0 with /132 for large) */
  headimgurl: string;
  /** User's privilege list (deprecated by WeChat, usually empty) */
  privilege: string[];
  /** User's UnionID (only available when application is bound to WeChat Open Platform) */
  unionid?: string;
}
