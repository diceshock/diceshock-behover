const WECHAT_API_BASE = "https://diceshock.com/wx-proxy";

export async function getWechatAccessToken(env: any): Promise<string> {
  const cached = await env.KV.get("wechat:mp:access_token");
  if (cached) {
    console.log("[wechat:api] access_token from cache");
    return cached;
  }

  const appId = env.WECHAT_MP_APP_ID;
  const appSecret = env.WECHAT_MP_APP_SECRET;

  if (!appId || !appSecret) {
    console.error(
      "[wechat:api] WECHAT_MP_APP_ID or WECHAT_MP_APP_SECRET not set",
    );
    throw new Error("WeChat MP credentials not configured");
  }

  console.log("[wechat:api] fetching new access_token");
  const url = `${WECHAT_API_BASE}/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    errcode?: number;
    errmsg?: string;
  };

  if (!data.access_token) {
    console.error("[wechat:api] failed to get access_token", {
      errcode: data.errcode,
      errmsg: data.errmsg,
    });
    throw new Error(
      `Failed to get WeChat access_token: ${data.errcode} ${data.errmsg}`,
    );
  }

  console.log("[wechat:api] got access_token, expires_in:", data.expires_in);
  await env.KV.put("wechat:mp:access_token", data.access_token, {
    expirationTtl: (data.expires_in ?? 7200) - 300,
  });

  return data.access_token;
}

const TOKEN_EXPIRED_CODES = new Set([40001, 40014, 42001]);

export async function sendCustomerTextMessage(
  env: any,
  openId: string,
  content: string,
): Promise<void> {
  console.log("[wechat:api] sending text message", {
    openId: openId.slice(-8),
    contentLen: content.length,
  });

  let token = await getWechatAccessToken(env);
  let data = await doSendText(token, openId, content);

  if (data.errcode && TOKEN_EXPIRED_CODES.has(data.errcode)) {
    console.log("[wechat:api] token expired, refreshing", {
      errcode: data.errcode,
    });
    await env.KV.delete("wechat:mp:access_token");
    token = await getWechatAccessToken(env);
    data = await doSendText(token, openId, content);
  }

  if (data.errcode && data.errcode !== 0) {
    console.error("[wechat:api] send text failed", {
      errcode: data.errcode,
      errmsg: data.errmsg,
      openId: openId.slice(-8),
    });
  } else {
    console.log("[wechat:api] send text ok");
  }
}

async function doSendText(
  token: string,
  openId: string,
  content: string,
): Promise<{ errcode?: number; errmsg?: string }> {
  const res = await fetch(
    `${WECHAT_API_BASE}/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: openId,
        msgtype: "text",
        text: { content },
      }),
    },
  );
  return (await res.json()) as { errcode?: number; errmsg?: string };
}

export async function sendCustomerImageMessage(
  env: any,
  openId: string,
  mediaId: string,
): Promise<void> {
  const token = await getWechatAccessToken(env);
  const res = await fetch(
    `${WECHAT_API_BASE}/cgi-bin/message/custom/send?access_token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: openId,
        msgtype: "image",
        image: { media_id: mediaId },
      }),
    },
  );
  const data = (await res.json()) as { errcode?: number; errmsg?: string };
  if (data.errcode && data.errcode !== 0) {
    console.error("[wechat:api] send image failed:", data);
  }
}

export async function uploadImageToWechat(
  env: any,
  imageUrl: string,
): Promise<string | null> {
  const token = await getWechatAccessToken(env);
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) return null;

  const blob = await imageRes.blob();
  const formData = new FormData();
  formData.append("media", blob, "membership.png");

  const uploadUrl = `${WECHAT_API_BASE}/cgi-bin/media/upload?access_token=${token}&type=image`;
  const res = await fetch(uploadUrl, { method: "POST", body: formData });
  const data = (await res.json()) as { media_id?: string; errcode?: number };

  if (data.errcode || !data.media_id) {
    console.error("[wechat:api] upload image failed:", data);
    return null;
  }
  return data.media_id;
}
