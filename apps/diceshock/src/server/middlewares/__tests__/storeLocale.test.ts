import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { HonoCtxEnv, InjectCrossData } from "@/shared/types";
import storeLocaleMiddleware from "../storeLocale";

function createTestApp(injectCrossData?: Partial<InjectCrossData>) {
  const app = new Hono<HonoCtxEnv>();

  app.use("*", async (c, next) => {
    if (injectCrossData) {
      c.set("InjectCrossData", injectCrossData as InjectCrossData);
    }
    return await next();
  });

  app.use("*", storeLocaleMiddleware);
  app.get("*", (c) =>
    c.json({
      store: c.get("StoreCode"),
      locale: c.get("LocaleCode"),
    }),
  );

  return app;
}

describe("storeLocaleMiddleware", () => {
  it("passes through /gg-zh_Hans/inventory and sets context", async () => {
    const res = await createTestApp().request("/gg-zh_Hans/inventory");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      store: "gg",
      locale: "zh_Hans",
    });
  });

  it("passes through /jdk-ja/me and sets context", async () => {
    const res = await createTestApp().request("/jdk-ja/me");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ store: "jdk", locale: "ja" });
  });

  it("skips /dash/orders (no redirect)", async () => {
    const res = await createTestApp().request("/dash/orders");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      store: "gg",
      locale: "zh_Hans",
    });
  });

  it("skips /apis/graphql (no redirect)", async () => {
    const res = await createTestApp().request("/apis/graphql");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      store: "gg",
      locale: "zh_Hans",
    });
  });

  it("redirects anonymous /inventory to /gg-zh_Hans/inventory", async () => {
    const res = await createTestApp().request("/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/inventory");
  });

  it("uses Accept-Language to determine target locale", async () => {
    const res = await createTestApp({
      UserAgentMeta: {
        language: "ja",
      } as InjectCrossData["UserAgentMeta"],
    }).request("/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-ja/inventory");
  });

  it("falls back to zh_Hans when Accept-Language is wildcard", async () => {
    const res = await createTestApp({
      UserAgentMeta: {
        language: "*",
      } as InjectCrossData["UserAgentMeta"],
    }).request("/actives");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/actives");
  });

  it("redirects /me to prefixed URL", async () => {
    const res = await createTestApp().request("/me");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/me");
  });

  it("redirects /t/ABC to prefixed URL", async () => {
    const res = await createTestApp().request("/t/ABC");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/t/ABC");
  });

  it("redirects root / to /gg-zh_Hans/", async () => {
    const res = await createTestApp().request("/");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/");
  });

  it("preserves query string during redirect", async () => {
    const res = await createTestApp().request("/inventory?page=2&sort=name");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "/gg-zh_Hans/inventory?page=2&sort=name",
    );
  });

  it("redirects using logged-in user store/locale preferences", async () => {
    const res = await createTestApp({
      UserInfo: {
        uid: "user-1",
        nickname: "Alice",
        phone: null,
        meta: null,
        preferred_store_id: "jdk",
        preferred_locale: "en",
      } as InjectCrossData["UserInfo"],
    }).request("/actives");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      store: "jdk",
      locale: "en",
    });
  });

  it("prefers user locale over Accept-Language header", async () => {
    const res = await createTestApp({
      UserAgentMeta: { language: "ja" } as InjectCrossData["UserAgentMeta"],
      UserInfo: {
        uid: "user-1",
        nickname: "Alice",
        phone: null,
        meta: null,
        preferred_store_id: "gg",
        preferred_locale: "ru",
      } as InjectCrossData["UserInfo"],
    }).request("/inventory");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      store: "gg",
      locale: "ru",
    });
  });

  it("redirects /xyz-en/inventory (invalid store 'xyz' treated as non-prefix path)", async () => {
    const res = await createTestApp().request("/xyz-en/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/xyz-en/inventory");
  });

  it("redirects /gg-klingon/inventory (invalid locale 'klingon' treated as non-prefix path)", async () => {
    const res = await createTestApp().request("/gg-klingon/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "/gg-zh_Hans/gg-klingon/inventory",
    );
  });

  it("redirects /GG-zh_Hans/inventory (uppercase store treated as non-prefix path)", async () => {
    const res = await createTestApp().request("/GG-zh_Hans/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "/gg-zh_Hans/GG-zh_Hans/inventory",
    );
  });

  it("redirects /gg-ZH_HANS/inventory (uppercase locale treated as non-prefix path)", async () => {
    const res = await createTestApp().request("/gg-ZH_HANS/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      "/gg-zh_Hans/gg-ZH_HANS/inventory",
    );
  });

  it("redirects /abc-def/inventory (both invalid treated as non-prefix path)", async () => {
    const res = await createTestApp().request("/abc-def/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/abc-def/inventory");
  });

  it("still redirects /inventory (no dash in first segment)", async () => {
    const res = await createTestApp().request("/inventory");

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/gg-zh_Hans/inventory");
  });

  it("still passes through /gg-en/inventory (valid prefix)", async () => {
    const res = await createTestApp().request("/gg-en/inventory");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ store: "gg", locale: "en" });
  });
});
