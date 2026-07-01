const WECHAT_API_BASE = "https://diceshock.com/wx-proxy";

interface WechatApiEnv {
  KV: KVNamespace;
  WECHAT_MP_APP_ID: string;
  WECHAT_MP_APP_SECRET: string;
}

export async function getWechatAccessToken(env: WechatApiEnv): Promise<string> {
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

export async function getUserUnionId(
  env: WechatApiEnv,
  openId: string,
): Promise<string | null> {
  try {
    const token = await getWechatAccessToken(env);
    const url = `${WECHAT_API_BASE}/cgi-bin/user/info?access_token=${token}&openid=${openId}&lang=zh_CN`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      unionid?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (data.errcode) {
      console.error("[wechat:api] getUserUnionId failed", {
        errcode: data.errcode,
        errmsg: data.errmsg,
      });
      return null;
    }
    return data.unionid || null;
  } catch (e) {
    console.error("[wechat:api] getUserUnionId error:", e);
    return null;
  }
}

const TOKEN_EXPIRED_CODES = new Set([40001, 40014, 42001]);

export async function sendCustomerTextMessage(
  env: WechatApiEnv,
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
  env: WechatApiEnv,
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
  env: WechatApiEnv,
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

// ─── Permanent Media (for articles) ─────────────────────────────────────────

/**
 * Upload an image for use inside article body (permanent, no media_id limit).
 * Returns a URL that can be used in <img src="..."> within the article HTML.
 * Uses /cgi-bin/media/uploadimg
 */
export async function uploadArticleBodyImage(
  env: WechatApiEnv,
  imageData: Uint8Array | Blob,
  filename = "article.png",
): Promise<string | null> {
  const token = await getWechatAccessToken(env);
  const formData = new FormData();
  const blob =
    imageData instanceof Blob
      ? imageData
      : new Blob([new Uint8Array(imageData)], { type: "image/png" });
  formData.append("media", blob, filename);

  const url = `${WECHAT_API_BASE}/cgi-bin/media/uploadimg?access_token=${token}`;
  const res = await fetch(url, { method: "POST", body: formData });
  const data = (await res.json()) as { url?: string; errcode?: number; errmsg?: string };

  if (data.errcode || !data.url) {
    console.error("[wechat:api] uploadimg failed:", data);
    return null;
  }
  return data.url;
}

/**
 * Upload a permanent thumb image for article cover.
 * Returns media_id for use in draft.
 * Uses /cgi-bin/material/add_material?type=thumb
 */
export async function uploadArticleCover(
  env: WechatApiEnv,
  imageData: Uint8Array | Blob,
  filename = "cover.png",
): Promise<string | null> {
  const token = await getWechatAccessToken(env);
  const formData = new FormData();
  const blob =
    imageData instanceof Blob
      ? imageData
      : new Blob([new Uint8Array(imageData)], { type: "image/png" });
  formData.append("media", blob, filename);

  const url = `${WECHAT_API_BASE}/cgi-bin/material/add_material?access_token=${token}&type=thumb`;
  const res = await fetch(url, { method: "POST", body: formData });
  const data = (await res.json()) as {
    media_id?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode || !data.media_id) {
    console.error("[wechat:api] add_material thumb failed:", data);
    return null;
  }
  return data.media_id;
}

// ─── Draft & Publish ─────────────────────────────────────────────────────────

export interface WechatDraftArticle {
  title: string;
  /** Author display name */
  author?: string;
  /** Abstract/digest shown in message list */
  digest?: string;
  /** HTML content body — images should use uploadArticleBodyImage URLs */
  content: string;
  /** Cover image media_id from uploadArticleCover */
  thumb_media_id: string;
  /** 1 = show cover in article body, 0 = don't */
  show_cover_pic?: 0 | 1;
  /** Redirect URL when "Read More" is tapped */
  content_source_url?: string;
}

/**
 * Create a draft (草稿) with one or more articles.
 * Returns media_id of the draft.
 */
export async function createDraft(
  env: WechatApiEnv,
  articles: WechatDraftArticle[],
): Promise<string | null> {
  const token = await getWechatAccessToken(env);
  const url = `${WECHAT_API_BASE}/cgi-bin/draft/add?access_token=${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      articles: articles.map((a) => ({
        title: a.title,
        author: a.author ?? "Diceshock",
        digest: a.digest ?? "",
        content: a.content,
        thumb_media_id: a.thumb_media_id,
        show_cover_pic: a.show_cover_pic ?? 0,
        content_source_url: a.content_source_url ?? "",
      })),
    }),
  });

  const data = (await res.json()) as {
    media_id?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode || !data.media_id) {
    console.error("[wechat:api] draft/add failed:", data);
    return null;
  }

  console.log("[wechat:api] draft created:", data.media_id);
  return data.media_id;
}

/**
 * Submit a draft for publishing (发布).
 * Returns publish_id for tracking.
 */
export async function submitPublish(
  env: WechatApiEnv,
  draftMediaId: string,
): Promise<string | null> {
  const token = await getWechatAccessToken(env);
  const url = `${WECHAT_API_BASE}/cgi-bin/freepublish/submit?access_token=${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ media_id: draftMediaId }),
  });

  const data = (await res.json()) as {
    publish_id?: string;
    errcode?: number;
    errmsg?: string;
  };

  if (data.errcode || !data.publish_id) {
    console.error("[wechat:api] freepublish/submit failed:", data);
    return null;
  }

  console.log("[wechat:api] publish submitted:", data.publish_id);
  return data.publish_id;
}
