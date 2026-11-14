import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  miniappAccount,
  miniappLogin,
  miniappLogout,
  miniappVerify,
} from "@/server/services/miniappAuth";
import { createDatabase } from "./database";

let fixture: ReturnType<typeof createDatabase>;
let env: Parameters<typeof miniappLogin>[0];
beforeEach(() => {
  fixture = createDatabase();
  fixture.sqlite.exec(
    "UPDATE user_info SET phone=id; UPDATE user_info SET phone='13800000000' WHERE id='p1'",
  );
  env = {
    DB: fixture.d1,
    KV: {
      get: vi.fn().mockResolvedValue("wechat-token"),
      put: vi.fn(),
    } as unknown as KVNamespace,
    WECHAT_MINIAPP_APP_ID: "test-app",
    WECHAT_MINIAPP_APP_SECRET: "test-secret",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: URL) =>
      Response.json(
        url.pathname.includes("jscode2session")
          ? { openid: "openid-1" }
          : {
              phone_info: { purePhoneNumber: "13800000000", countryCode: "86" },
            },
      ),
    ),
  );
});
afterEach(() => {
  fixture.sqlite.close();
  vi.unstubAllGlobals();
});
describe("miniapp identity", () => {
  it("links a verified phone to an existing member and stores only the token hash", async () => {
    const result = await miniappVerify(env, "code", "phone-code", "Player");
    expect(result.profile.id).toBe("p1");
    const persisted = fixture.sqlite
      .prepare("SELECT sessionToken FROM session")
      .get()?.sessionToken;
    expect(persisted).not.toBe(result.accessToken);
    expect(String(persisted)).toMatch(/^ds-miniapp:[a-f0-9]{64}$/);
    expect(
      (await miniappAccount(env.DB, `Bearer ${result.accessToken}`)).id,
    ).toBe("p1");
    expect((await miniappLogin(env, "code")).profile?.id).toBe("p1");
    await miniappLogout(env.DB, `Bearer ${result.accessToken}`);
    await expect(
      miniappAccount(env.DB, `Bearer ${result.accessToken}`),
    ).rejects.toThrow("重新登录");
  });
  it("rejects expired sessions and disabled members", async () => {
    const result = await miniappVerify(env, "code", "phone-code", "Player");
    fixture.sqlite.exec("UPDATE session SET expires=0");
    await expect(
      miniappAccount(env.DB, `Bearer ${result.accessToken}`),
    ).rejects.toThrow();
    fixture.sqlite.exec(
      "UPDATE session SET expires=9999999999999; UPDATE user SET disabled=1 WHERE id='p1'",
    );
    await expect(
      miniappAccount(env.DB, `Bearer ${result.accessToken}`),
    ).rejects.toThrow();
  });
  it("does not reassign a bound WeChat identity to a different verified phone", async () => {
    await miniappVerify(env, "code", "phone-code", "Player");
    fixture.sqlite.exec(
      "UPDATE user_info SET phone='13900000000' WHERE id='p1'; UPDATE user_info SET phone='13800000000' WHERE id='p2'",
    );
    await expect(
      miniappVerify(env, "code", "phone-code", "Player"),
    ).rejects.toThrow("核对");
    expect(
      fixture.sqlite.prepare("SELECT userId FROM account").get()?.userId,
    ).toBe("p1");
  });
  it("requires configuration and handles WeChat failure without issuing a session", async () => {
    await expect(
      miniappLogin({ ...env, WECHAT_MINIAPP_APP_SECRET: "" }, "code"),
    ).rejects.toThrow("未配置");
    vi.mocked(fetch).mockResolvedValue(Response.json({ errcode: 40029 }));
    await expect(miniappLogin(env, "code")).rejects.toThrow("微信验证失败");
    expect(
      fixture.sqlite.prepare("SELECT count(*) AS n FROM session").get()?.n,
    ).toBe(0);
  });
});
