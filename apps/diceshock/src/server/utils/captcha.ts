import CaptchaClient, {
  VerifyIntelligentCaptchaRequest,
} from "@alicloud/captcha20230305";

/**
 * 服务端校验阿里云验证码 2.0 token
 * 调用 VerifyIntelligentCaptcha API 验证前端传来的 captchaVerifyParam
 *
 * @param env - Worker 环境变量（需包含 ALIBABA_CLOUD_ACCESS_KEY_ID/SECRET）
 */
export async function verifyCaptchaToken(
  env: Record<string, unknown>,
  captchaVerifyParam: string,
  sceneId: string,
): Promise<boolean> {
  try {
    const accessKeyId = env.ALIBABA_CLOUD_ACCESS_KEY_ID as string | undefined;
    const accessKeySecret = env.ALIBABA_CLOUD_ACCESS_KEY_SECRET as
      | string
      | undefined;

    if (!accessKeyId || !accessKeySecret) {
      // 如果没配置凭据则放行（避免阻塞流程）
      return true;
    }

    const { Config } = await import("@alicloud/openapi-client");
    const config = new Config({
      accessKeyId,
      accessKeySecret,
    });
    config.endpoint = "captcha.cn-shanghai.aliyuncs.com";

    const CaptchaClientMod =
      typeof CaptchaClient === "function"
        ? CaptchaClient
        : (CaptchaClient as unknown as { default: typeof CaptchaClient })
            .default;

    const client = new CaptchaClientMod(config);

    const request = new VerifyIntelligentCaptchaRequest({
      captchaVerifyParam,
      sceneId,
    });

    const response = await client.verifyIntelligentCaptcha(request);
    const result = response.body?.result;
    return result?.verifyResult === true;
  } catch (_err) {
    // 验证服务异常时放行，避免阻塞用户
    return true;
  }
}
