import { readFileSync } from "node:fs";
import { buildSchema, parse, validate } from "graphql";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as documents from "../src/graphql/__generated__/operations";
import { graphql } from "../src/services/client";
import { definePage } from "../src/utils/page";

// Runtime globals of the WeChat JS engine and build-time `define`s; config.ts
// reads the defines at module evaluation, so they must exist before imports.
const { wx, Page } = vi.hoisted(() => {
  const globals = {
    wx: {
      getStorageSync: vi.fn(() => "token"),
      removeStorageSync: vi.fn(),
      setStorageSync: vi.fn(),
      request: vi.fn(),
    },
    Page: vi.fn(),
  };
  Object.assign(globalThis, globals, {
    __API_ORIGIN__: "https://example.test",
    __STORE_MEDIA__: {},
  });
  return globals;
});

afterEach(() => vi.clearAllMocks());

describe("miniapp client", () => {
  it("uses only valid GraphQL operations", () => {
    const sdl = readFileSync(
      new URL("../../diceshock/schema.graphql", import.meta.url),
      "utf8",
    );
    const schema = buildSchema(
      "type Query { _unused: Boolean } type Mutation { _unused: Boolean } type OperationResult { success: Boolean! message: String }" +
        sdl.slice(sdl.indexOf("# TRPG uses")),
    );
    const operations = Object.entries(documents).filter(([name]) =>
      /[a-z]Document$/.test(name),
    );
    expect(operations.length).toBeGreaterThan(0);
    for (const [, document] of operations)
      expect(validate(schema, parse(String(document)))).toEqual([]);
  });

  it("clears expired credentials and surfaces errors", async () => {
    wx.request.mockImplementation((options) =>
      options.success({ statusCode: 401, data: {} }),
    );
    await expect(graphql(documents.ProfileDocument)).rejects.toThrow(
      "登录已过期",
    );
    expect(wx.removeStorageSync).toHaveBeenCalled();
  });

  it("rejects GraphQL errors even when HTTP returns 200", async () => {
    wx.request.mockImplementation((options) =>
      options.success({ statusCode: 200, data: { errors: ["席位已满"] } }),
    );
    await expect(graphql(documents.JoinDocument, { id: "s1" })).rejects.toThrow(
      "席位已满",
    );
  });

  it("does not write busy or error state after page unload", async () => {
    definePage({ data: {} });
    const options = Page.mock.calls[0][0];
    const page = { data: { busy: false }, disposed: false, setData: vi.fn() };
    let reject: (reason: Error) => void = () => {};
    const task = new Promise((_resolve, fail) => {
      reject = fail;
    });
    const work = options.run.call(page, () => task);
    options.onUnload.call(page);
    reject(new Error("offline"));
    await work;
    expect(page.setData).toHaveBeenCalledTimes(1);
  });
});
