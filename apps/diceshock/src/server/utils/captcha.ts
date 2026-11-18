/**
 * 服务端校验阿里云验证码 2.0 token。
 *
 * 直接用 Worker 原生的 fetch + Web Crypto 调用 VerifyIntelligentCaptcha，
 * 不引入 @alicloud SDK：该 SDK 面向 Node，打包进 Worker 时在部分构建环境下
 * 无法解析（Workers Builds 上曾导致构建失败）。
 *
 * 未配置 AccessKey 或校验服务异常时放行，避免把登录整体卡死。
 */

const ENDPOINT = "https://captcha.cn-shanghai.aliyuncs.com";

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return toHex(sig);
}

async function callVerifyCaptcha(
  accessKeyId: string,
  accessKeySecret: string,
  captchaVerifyParam: string,
  sceneId: string,
): Promise<boolean> {
  const params: Record<string, string> = {
    Action: "VerifyIntelligentCaptcha",
    Version: "2023-03-05",
    Format: "JSON",
    AccessKeyId: accessKeyId,
    SignatureMethod: "HMAC-SHA256",
    SignatureVersion: "1.0",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    SignatureNonce: crypto.randomUUID(),
    CaptchaVerifyParam: captchaVerifyParam,
    SceneId: sceneId,
  };

  const canonical = Object.keys(params)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(params[k])}`)
    .join("&");

  const stringToSign = `GET&${percentEncode("/")}&${percentEncode(canonical)}`;
  const signature = await hmacSha256Hex(`${accessKeySecret}&`, stringToSign);

  const query = `${canonical}&Signature=${percentEncode(signature)}`;
  const res = await fetch(`${ENDPOINT}/?${query}`, {
    method: "GET",
    headers: { accept: "application/json" },
  });
  if (!res.ok) return false;
  const body = (await res.json()) as {
    Result?: { VerifyResult?: boolean };
  };
  return body.Result?.VerifyResult === true;
}

/**
 * 校验验证码 token。
 *
 * @param env Worker 环境变量（含 ALIBABA_CLOUD_ACCESS_KEY_ID/SECRET）
 * @param captchaVerifyParam 前端验证码 SDK 返回的 captchaVerifyParam
 * @param sceneId 阿里云验证码场景 ID
 */
export async function verifyCaptchaToken(
  env: Record<string, unknown>,
  captchaVerifyParam: string,
  sceneId: string,
): Promise<boolean> {
  const accessKeyId = env.ALIBABA_CLOUD_ACCESS_KEY_ID as string | undefined;
  const accessKeySecret = env.ALIBABA_CLOUD_ACCESS_KEY_SECRET as
    | string
    | undefined;

  // 未配置凭据时放行，避免阻塞登录
  if (!accessKeyId || !accessKeySecret) return true;
  if (!captchaVerifyParam) return false;

  try {
    return await callVerifyCaptcha(
      accessKeyId,
      accessKeySecret,
      captchaVerifyParam,
      sceneId,
    );
  } catch (err) {
    console.error("[captcha] verify failed", err);
    // 校验服务异常时放行，避免阻塞用户
    return true;
  }
}
