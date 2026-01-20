import Dysmsapi20170525 from "@alicloud/dysmsapi20170525";
import * as $OpenApi from "@alicloud/openapi-client";

import { FACTORY } from "../factory";

const aliyunInj = FACTORY.createMiddleware(async (c, next) => {
  const config = new $OpenApi.Config({
    accessKeyId: c.env["ALIBABA_CLOUD_ACCESS_KEY_ID"],
    accessKeySecret: c.env["ALIBABA_CLOUD_ACCESS_KEY_SECRET"],
  });

  config.endpoint = `dysmsapi.aliyuncs.com`;

  const client = new Dysmsapi20170525(config);

  c.set("AliyunClient", client);

  return await next();
});

export default aliyunInj;
