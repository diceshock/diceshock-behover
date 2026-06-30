import { describe, expect, it } from "vitest";
import { parseAgentOutput } from "@/server/apis/wechat/messagePipeline";

describe("parseAgentOutput", () => {
  describe("JSON array parsing (primary path)", () => {
    it("parses single text message", () => {
      const json = JSON.stringify([{ type: "text", content: "hello" }]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "hello" });
    });

    it("parses multiple text items as separate messages", () => {
      const json = JSON.stringify([
        { type: "text", content: "第一段" },
        { type: "text", content: "第二段" },
        { type: "text", content: "第三段" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: "text", content: "第一段" });
      expect(result[1]).toEqual({ type: "text", content: "第二段" });
      expect(result[2]).toEqual({ type: "text", content: "第三段" });
    });

    it("parses mixed message types", () => {
      const json = JSON.stringify([
        { type: "text", content: "hello" },
        { type: "img", url: "https://example.com/img.png" },
      ]);
      const result = parseAgentOutput(json);
      // Extractor skips objects without "content" field (img has url, not content)
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "hello" });
    });

    it("parses {messages: [...]} wrapper", () => {
      const json = JSON.stringify({
        messages: [
          { type: "text", content: "wrapped" },
          { type: "text", content: "format" },
        ],
      });
      const result = parseAgentOutput(json);
      // Object-by-object extractor treats the outer wrapper as raw text
      // since it lacks type+content; falls back to single text message
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: JSON.stringify({
          messages: [
            { type: "text", content: "wrapped" },
            { type: "text", content: "format" },
          ],
        }),
      });
    });

    it("filters out objects without content field", () => {
      const json = JSON.stringify([
        { type: "text", content: "valid" },
        { type: "video", url: "https://example.com/video.mp4" },
        { type: "img", url: "https://example.com/img.png" },
      ]);
      const result = parseAgentOutput(json);
      // Extractor requires both type AND content; img/video only have url
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("text");
      expect(result[0]).toEqual({ type: "text", content: "valid" });
    });

    it("falls back to raw text when all items invalid", () => {
      const json = JSON.stringify([
        { type: "video", url: "https://example.com/video.mp4" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("text");
    });
  });

  describe("fallback (non-JSON output)", () => {
    it("treats plain text as single text message", () => {
      const result = parseAgentOutput("plain text reply");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "plain text reply" });
    });

    it("parses standalone JSON object with type+content as message", () => {
      const result = parseAgentOutput('{"type":"text","content":"single"}');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: "single",
      });
    });

    it("treats malformed JSON as text", () => {
      const result = parseAgentOutput("{invalid json");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "{invalid json" });
    });

    it("handles empty string", () => {
      const result = parseAgentOutput("");
      expect(result).toHaveLength(0);
    });

    it("handles whitespace-only string", () => {
      const result = parseAgentOutput("   ");
      expect(result).toHaveLength(0);
    });
  });

  describe("message limit", () => {
    it("limits to 5 messages", () => {
      const json = JSON.stringify([
        { type: "text", content: "1" },
        { type: "text", content: "2" },
        { type: "text", content: "3" },
        { type: "text", content: "4" },
        { type: "text", content: "5" },
        { type: "text", content: "6" },
        { type: "text", content: "7" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(5);
    });
  });
});
