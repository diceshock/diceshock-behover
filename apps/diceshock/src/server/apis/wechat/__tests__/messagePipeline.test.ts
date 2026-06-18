import { describe, expect, it } from "vitest";
import { parseAgentOutput } from "../messagePipeline";

describe("parseAgentOutput", () => {
  describe("valid JSON parsing", () => {
    it("parses valid JSON array of text messages", () => {
      const result = parseAgentOutput('[{"type":"text","content":"hello"}]');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "hello" });
    });

    it("parses mixed message types", () => {
      const json = JSON.stringify([
        { type: "text", content: "hello" },
        { type: "img", url: "https://example.com/img.png" },
        {
          type: "totp",
          qrcode_url: "https://qr.example.com",
          code: "123456",
          remaining_seconds: 30,
        },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ type: "text", content: "hello" });
      expect(result[1]).toEqual({
        type: "img",
        url: "https://example.com/img.png",
      });
    });

    it("filters out unrecognized message types", () => {
      const json = JSON.stringify([
        { type: "text", content: "valid" },
        { type: "video", url: "https://example.com/video.mp4" },
        { type: "unknown", data: "bad" },
        { type: "img", url: "https://example.com/img.png" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe("text");
      expect(result[1].type).toBe("img");
    });

    it("falls back to text when all messages are invalid", () => {
      const json = JSON.stringify([
        { type: "video", url: "https://example.com/video.mp4" },
        { type: "file", path: "/tmp/file.pdf" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: json,
      });
    });
  });

  describe("invalid JSON fallback", () => {
    it("falls back to text on invalid JSON", () => {
      const result = parseAgentOutput("plain text reply");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "plain text reply" });
    });

    it("falls back to text on non-array JSON", () => {
      const result = parseAgentOutput('{"type":"text","content":"single"}');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: '{"type":"text","content":"single"}',
      });
    });

    it("falls back to text on malformed JSON", () => {
      const result = parseAgentOutput("{invalid json");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ type: "text", content: "{invalid json" });
    });

    it("handles empty string gracefully", () => {
      const result = parseAgentOutput("");
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

    it("returns all messages when exactly 3", () => {
      const json = JSON.stringify([
        { type: "text", content: "1" },
        { type: "text", content: "2" },
        { type: "text", content: "3" },
      ]);
      const result = parseAgentOutput(json);
      expect(result).toHaveLength(3);
    });
  });
});
