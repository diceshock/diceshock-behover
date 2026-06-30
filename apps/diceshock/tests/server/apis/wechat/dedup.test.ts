import { describe, expect, it, vi } from "vitest";
import { isDuplicate, markProcessed } from "@/server/apis/wechat/dedup";

describe("dedup", () => {
  function mockKV() {
    return {
      get: vi.fn(),
      put: vi.fn(),
      list: vi.fn(),
      delete: vi.fn(),
      getWithMetadata: vi.fn(),
    };
  }

  describe("isDuplicate", () => {
    it("returns false for first message", async () => {
      const kv = mockKV();
      vi.mocked(kv.get).mockResolvedValue(null);
      expect(await isDuplicate(kv, "msg123")).toBe(false);
    });

    it("returns true for duplicate message", async () => {
      const kv = mockKV();
      vi.mocked(kv.get).mockResolvedValue("1");
      expect(await isDuplicate(kv, "msg456")).toBe(true);
    });

    it("returns false for empty msgId", async () => {
      const kv = mockKV();
      expect(await isDuplicate(kv, "")).toBe(false);
      expect(kv.get).not.toHaveBeenCalled();
    });

    it("returns false for non-empty string already expired", async () => {
      const kv = mockKV();
      vi.mocked(kv.get).mockResolvedValue(null);
      expect(await isDuplicate(kv, "expired-msg")).toBe(false);
      expect(kv.get).toHaveBeenCalledWith("wechat:dedup:expired-msg");
    });
  });

  describe("markProcessed", () => {
    it("marks message with 60s TTL", async () => {
      const kv = mockKV();
      await markProcessed(kv, "msg456");
      expect(kv.put).toHaveBeenCalledWith("wechat:dedup:msg456", "1", {
        expirationTtl: 60,
      });
    });

    it("skips empty msgId", async () => {
      const kv = mockKV();
      await markProcessed(kv, "");
      expect(kv.put).not.toHaveBeenCalled();
    });

    it("uses correct KV key prefix", async () => {
      const kv = mockKV();
      await markProcessed(kv, "unique-id");
      expect(kv.put).toHaveBeenCalledTimes(1);
      const [key] = kv.put.mock.calls[0];
      expect(key).toBe("wechat:dedup:unique-id");
    });
  });

  describe("integration: isDuplicate + markProcessed", () => {
    it("returns false then true after marking", async () => {
      const kv = mockKV();
      vi.mocked(kv.get).mockResolvedValue(null);
      expect(await isDuplicate(kv, "msg789")).toBe(false);

      await markProcessed(kv, "msg789");
      expect(kv.put).toHaveBeenCalledTimes(1);

      vi.mocked(kv.get).mockResolvedValue("1");
      expect(await isDuplicate(kv, "msg789")).toBe(true);
    });
  });
});
