import { describe, expect, it } from "vitest";
import { estimateTokens } from "@/server/apis/wechat/conversationContext";

describe("estimateTokens", () => {
  describe("Chinese text", () => {
    it("estimates Chinese chars at 1.5 tokens each", () => {
      expect(estimateTokens("你好")).toBe(3);
      expect(estimateTokens("你好世界")).toBe(6);
      expect(estimateTokens("桌游")).toBe(3);
    });

    it("ceils fractional token counts", () => {
      expect(estimateTokens("你")).toBe(2);
    });
  });

  describe("ASCII text", () => {
    it("estimates ASCII at 0.25 tokens per char", () => {
      expect(estimateTokens("abcd")).toBe(1);
      expect(estimateTokens("hello")).toBe(2);
    });

    it("handles single ASCII character", () => {
      expect(estimateTokens("a")).toBe(1);
    });
  });

  describe("mixed content", () => {
    it("handles Chinese + ASCII mix", () => {
      expect(estimateTokens("你好 hello")).toBe(5);
    });

    it("handles Chinese + digits", () => {
      expect(estimateTokens("桌游123")).toBe(4);
    });

    it("handles long mixed sentences deterministically", () => {
      const input = "排行榜Top10: Alice, Bob";
      const result = estimateTokens(input);
      expect(result).toBeGreaterThan(0);
      expect(estimateTokens(input)).toBe(result);
    });
  });

  describe("edge cases", () => {
    it("returns 0 for empty string", () => {
      expect(estimateTokens("")).toBe(0);
    });

    it("handles punctuation", () => {
      expect(estimateTokens("你好！")).toBe(5);
    });

    it("handles newlines and whitespace", () => {
      expect(estimateTokens("hello\nworld")).toBe(3);
    });

    it("handles special Chinese punctuation", () => {
      expect(estimateTokens("你好：世界")).toBe(8);
    });
  });
});
