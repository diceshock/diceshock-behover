import { describe, expect, it } from "vitest";

describe("smoke test", () => {
  it("basic arithmetic works", () => {
    expect(1 + 1).toBe(2);
  });

  it("vitest globals are available", () => {
    expect(typeof describe).toBe("function");
    expect(typeof it).toBe("function");
    expect(typeof expect).toBe("function");
  });
});
