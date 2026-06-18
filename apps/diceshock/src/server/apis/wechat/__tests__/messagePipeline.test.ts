import { describe, expect, it } from "vitest";
import { parseAgentOutput } from "../messagePipeline";

describe("parseAgentOutput", () => {
  describe("plain text (primary path)", () => {
    it("returns single paragraph as one message", () => {
      const result = parseAgentOutput("你好，欢迎来到桌游吧！");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: "你好，欢迎来到桌游吧！",
      });
    });

    it("splits multiple paragraphs into separate messages", () => {
      const input = "第一段内容\n\n第二段内容\n\n第三段内容";
      const result = parseAgentOutput(input);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: "text", content: "第一段内容" });
      expect(result[1]).toEqual({ type: "text", content: "第二段内容" });
      expect(result[2]).toEqual({ type: "text", content: "第三段内容" });
    });

    it("keeps list items grouped in one message", () => {
      const input = "可选桌游：\n- 卡坦岛\n- 璀璨宝石\n- 花火";
      const result = parseAgentOutput(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: "可选桌游：\n- 卡坦岛\n- 璀璨宝石\n- 花火",
      });
    });

    it("splits paragraphs but keeps lists intact", () => {
      const input =
        "以下是推荐：\n\n1. 卡坦岛\n2. 璀璨宝石\n3. 花火\n\n需要更多推荐请告诉我";
      const result = parseAgentOutput(input);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: "text", content: "以下是推荐：" });
      expect(result[1]).toEqual({
        type: "text",
        content: "1. 卡坦岛\n2. 璀璨宝石\n3. 花火",
      });
      expect(result[2]).toEqual({
        type: "text",
        content: "需要更多推荐请告诉我",
      });
    });

    it("handles empty string", () => {
      const result = parseAgentOutput("");
      expect(result).toHaveLength(0);
    });

    it("handles whitespace-only string", () => {
      const result = parseAgentOutput("   \n\n  ");
      expect(result).toHaveLength(0);
    });
  });

  describe("JSON fallback (backward compatibility)", () => {
    it("extracts text from JSON array and merges", () => {
      const json = JSON.stringify([
        { type: "text", content: "你好" },
        { type: "text", content: "欢迎光临" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: "text", content: "你好" });
      expect(result[1]).toEqual({ type: "text", content: "欢迎光临" });
    });

    it("ignores non-text types in JSON array", () => {
      const json = JSON.stringify([
        { type: "text", content: "hello" },
        { type: "img", url: "https://example.com/img.png" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "hello" });
    });

    it("falls back to raw text when JSON has no text items", () => {
      const json = JSON.stringify([
        { type: "img", url: "https://example.com/img.png" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("text");
    });

    it("treats non-array JSON as plain text", () => {
      const result = parseAgentOutput('{"type":"text","content":"single"}');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: '{"type":"text","content":"single"}',
      });
    });

    it("treats malformed JSON as plain text", () => {
      const result = parseAgentOutput("{invalid json");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "{invalid json" });
    });
  });

  describe("message limit", () => {
    it("limits to 5 messages max", () => {
      const input = "一\n\n二\n\n三\n\n四\n\n五\n\n六\n\n七";
      const result = parseAgentOutput(input);
      expect(result).toHaveLength(5);
    });
  });
});
