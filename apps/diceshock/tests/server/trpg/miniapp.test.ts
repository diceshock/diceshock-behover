import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { buildSchema, parse, validate } from "graphql";
import { describe, expect, it, vi } from "vitest";

const root = new URL("../../../../miniapp/", import.meta.url);
const source = (path: string) => readFileSync(new URL(path, root), "utf8");
const operations = createRequire(import.meta.url)(
  new URL("services/operations.js", root).pathname.replace(/^\/(.:\/)/, "$1"),
);
function client() {
  const wx = {
    getStorageSync: vi.fn(() => "token"),
    removeStorageSync: vi.fn(),
    setStorageSync: vi.fn(),
    request: vi.fn(),
  };
  const module = {
    exports: {} as { graphql: (query: string) => Promise<unknown> },
  };
  runInNewContext(source("services/client.js"), {
    require: () => ({ apiOrigin: "https://example.test" }),
    module,
    wx,
    Promise,
    Error,
  });
  return { wx, api: module.exports };
}
describe("miniapp client", () => {
  it("uses only valid GraphQL operations", () => {
    const sdl = readFileSync(
      new URL("../../../schema.graphql", import.meta.url),
      "utf8",
    );
    const schema = buildSchema(
      "type Query { _unused: Boolean } type Mutation { _unused: Boolean } type OperationResult { success: Boolean! message: String }" +
        sdl.slice(sdl.indexOf("# TRPG uses")),
    );
    for (const query of Object.values(operations))
      expect(validate(schema, parse(query as string))).toEqual([]);
  });
  it("clears expired credentials and surfaces errors", async () => {
    const { wx, api } = client();
    wx.request.mockImplementation((options) =>
      options.success({ statusCode: 401, data: {} }),
    );
    await expect(api.graphql("query { x }")).rejects.toThrow("登录已过期");
    expect(wx.removeStorageSync).toHaveBeenCalled();
  });
  it("rejects GraphQL errors even when HTTP returns 200", async () => {
    const { wx, api } = client();
    wx.request.mockImplementation((options) =>
      options.success({ statusCode: 200, data: { errors: ["席位已满"] } }),
    );
    await expect(api.graphql("mutation { x }")).rejects.toThrow("席位已满");
  });
  it("does not write busy or error state after page unload", async () => {
    const module = {
      exports: {} as { run: (task: () => Promise<unknown>) => Promise<void> },
    };
    runInNewContext(source("utils/page.js"), { module });
    const page = { data: { busy: false }, disposed: false, setData: vi.fn() };
    let reject: (reason: Error) => void = () => {};
    const task = new Promise((_resolve, fail) => {
      reject = fail;
    });
    const work = module.exports.run.call(page, () => task);
    page.disposed = true;
    reject(new Error("offline"));
    await work;
    expect(page.setData).toHaveBeenCalledTimes(1);
  });
});
