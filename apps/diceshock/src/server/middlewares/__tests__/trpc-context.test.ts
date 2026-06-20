import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { HonoCtxEnv } from "@/shared/types";

describe("tRPC context — storeCode & locale", () => {
  it("HonoCtxEnv.Variables includes StoreCode and LocaleCode", () => {
    // Type-level verification: if this compiles, the types are correct.
    const vars: HonoCtxEnv["Variables"] = {} as HonoCtxEnv["Variables"];

    // StoreCode and LocaleCode are accessible (even if undefined)
    expect(typeof vars.StoreCode).toMatch(/string|undefined/);
    expect(typeof vars.LocaleCode).toMatch(/string|undefined/);
  });

  it("Hono context get() works with StoreCode and LocaleCode variables", async () => {
    const app = new Hono<HonoCtxEnv>();

    // Simulate what Task 7 middleware will do: set StoreCode and LocaleCode
    app.use(async (c, next) => {
      c.set("StoreCode", "gg");
      c.set("LocaleCode", "en");
      await next();
    });

    app.get("/test", (c) => {
      const storeCode = c.get("StoreCode");
      const localeCode = c.get("LocaleCode");
      return c.json({ storeCode, localeCode });
    });

    const res = await app.request("http://localhost/test");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ storeCode: "gg", localeCode: "en" });
  });

  it("StoreCode and LocaleCode are undefined by default (not set by middleware)", async () => {
    const app = new Hono<HonoCtxEnv>();

    app.get("/test", (c) => {
      const storeCode = c.get("StoreCode");
      const localeCode = c.get("LocaleCode");
      return c.json({ storeCode, localeCode });
    });

    const res = await app.request("http://localhost/test");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ storeCode: undefined, localeCode: undefined });
  });
});
