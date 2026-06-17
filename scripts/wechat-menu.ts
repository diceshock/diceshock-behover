#!/usr/bin/env -S npx tsx

/**
 * Run: WECHAT_MP_APP_ID=xxx WECHAT_MP_APP_SECRET=xxx npx tsx scripts/wechat-menu.ts
 * Or: wrangler secret list to verify secrets, then adjust to use CF secret fetch
 */

const APP_ID = process.env.WECHAT_MP_APP_ID;
const APP_SECRET = process.env.WECHAT_MP_APP_SECRET;

if (!APP_ID || !APP_SECRET) {
  console.error("Missing WECHAT_MP_APP_ID or WECHAT_MP_APP_SECRET");
  process.exit(1);
}

async function getAccessToken(): Promise<string> {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APP_ID}&secret=${APP_SECRET}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    access_token?: string;
    errcode?: number;
    errmsg?: string;
  };
  if (!data.access_token) {
    throw new Error(
      `Failed to get access_token: ${data.errcode} ${data.errmsg}`,
    );
  }
  return data.access_token;
}

const MENU = {
  button: [
    {
      type: "click",
      name: "会员计划",
      key: "MEMBERSHIP_PLAN",
    },
    {
      type: "view",
      name: "进入店铺",
      url: "https://diceshock.com",
    },
  ],
};

async function createMenu(accessToken: string): Promise<void> {
  const url = `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${accessToken}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(MENU),
  });
  const data = (await res.json()) as { errcode: number; errmsg: string };
  if (data.errcode !== 0) {
    throw new Error(`Menu creation failed: ${data.errcode} ${data.errmsg}`);
  }
  console.log("Menu created successfully");
}

async function main() {
  const token = await getAccessToken();
  await createMenu(token);
}

main().catch(console.error);
