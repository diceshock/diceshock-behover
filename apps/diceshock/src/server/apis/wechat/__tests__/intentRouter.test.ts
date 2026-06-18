import { describe, expect, it } from "vitest";
import { detectIntent } from "../intentRouter";

describe("intentRouter", () => {
  describe("boardgame routing", () => {
    it("routes boardgame keywords correctly", () => {
      expect(detectIntent("桌游库存有卡坦岛吗").skillId).toBe("boardgame");
      expect(detectIntent("有什么游戏推荐").skillId).toBe("boardgame");
      expect(detectIntent("这个桌游在架吗").skillId).toBe("boardgame");
    });

    it("routes boardgame player-count queries", () => {
      expect(detectIntent("有什么4人可以玩的游戏").skillId).toBe("boardgame");
      expect(detectIntent("查一下库存").skillId).toBe("boardgame");
    });
  });

  describe("mahjong routing", () => {
    it("routes mahjong keywords correctly", () => {
      expect(detectIntent("我的日麻战绩").skillId).toBe("mahjong");
      expect(detectIntent("排行榜怎么看").skillId).toBe("mahjong");
      expect(detectIntent("查一下我的PP和排名").skillId).toBe("mahjong");
    });

    it("routes mahjong badges query", () => {
      expect(detectIntent("我有哪些徽章").skillId).toBe("mahjong");
      expect(detectIntent("日麻对局记录").skillId).toBe("mahjong");
    });
  });

  describe("account routing", () => {
    it("routes account keywords correctly", () => {
      expect(detectIntent("查一下我的通行证").skillId).toBe("account");
      expect(detectIntent("储值余额多少").skillId).toBe("account");
      expect(detectIntent("我的会员到期了没").skillId).toBe("account");
    });

    it("routes membership and profile queries", () => {
      expect(detectIntent("怎么改昵称").skillId).toBe("account");
      expect(detectIntent("我的名片").skillId).toBe("account");
      expect(detectIntent("扫码注册").skillId).toBe("account");
    });
  });

  describe("active routing", () => {
    it("routes active keywords correctly", () => {
      expect(detectIntent("今天有什么约局").skillId).toBe("active");
      expect(detectIntent("我想报名组局").skillId).toBe("active");
      expect(detectIntent("参加一下拼桌").skillId).toBe("active");
    });
  });

  describe("event routing", () => {
    it("routes event keywords correctly", () => {
      expect(detectIntent("最近有什么新闻").skillId).toBe("event");
      expect(detectIntent("公告在哪里看").skillId).toBe("event");
      expect(detectIntent("有什么新活动").skillId).toBe("event");
    });
  });

  describe("general fallback", () => {
    it("returns general for greetings", () => {
      expect(detectIntent("你好").skillId).toBe("general");
      expect(detectIntent("您好").skillId).toBe("general");
      expect(detectIntent("hi").skillId).toBe("general");
      expect(detectIntent("hello").skillId).toBe("general");
    });

    it("returns general for empty messages", () => {
      expect(detectIntent("").skillId).toBe("general");
      expect(detectIntent("   ").skillId).toBe("general");
    });

    it("returns general for unknown queries", () => {
      expect(detectIntent("今天天气怎么样").skillId).toBe("general");
      expect(detectIntent("随便聊聊").skillId).toBe("general");
    });
  });

  describe("context continuity", () => {
    it("continues context from recent assistant metadata", () => {
      const history = [
        {
          role: "assistant" as const,
          content: "这是桌游相关回复",
          metadata: '{"skillId":"boardgame"}',
        },
      ];
      expect(detectIntent("还有吗", history).skillId).toBe("boardgame");
      expect(detectIntent("继续", history).skillId).toBe("boardgame");
      expect(detectIntent("然后呢", history).skillId).toBe("boardgame");
    });

    it("preserves mahjong context across follow-ups", () => {
      const history = [
        {
          role: "assistant" as const,
          content: "日麻数据",
          metadata: '{"skillId":"mahjong"}',
        },
      ];
      expect(detectIntent("再来", history).skillId).toBe("mahjong");
    });

    it("skips general metadata for context", () => {
      const history = [
        {
          role: "assistant" as const,
          content: "你好有什么可以帮您",
          metadata: '{"skillId":"general"}',
        },
      ];
      // "general" context is skipped, falls through to general
      expect(detectIntent("还有吗", history).skillId).toBe("general");
    });

    it("detects context from older assistant messages when most recent is stale", () => {
      const history = [
        {
          role: "assistant" as const,
          content: "这里是活动相关的信息",
          metadata: '{"skillId":"event"}',
        },
        {
          role: "user" as const,
          content: "好的",
          metadata: undefined as string | undefined,
        },
        {
          role: "assistant" as const,
          content: "有什么可以帮您的",
          metadata: '{"skillId":"general"}',
        },
      ];
      // Most recent assistant is "general" (skipped), next is "event"
      expect(detectIntent("更多", history).skillId).toBe("event");
    });
  });

  describe("active/event overlap resolution", () => {
    it("favors active when 约 is present", () => {
      expect(detectIntent("约局活动").skillId).toBe("active");
    });

    it("routes to event when only event keywords match", () => {
      expect(detectIntent("最近活动").skillId).toBe("event");
      expect(detectIntent("最新活动通知").skillId).toBe("event");
    });
  });

  describe("confidence levels", () => {
    it("returns high confidence for explicit keyword matches", () => {
      expect(detectIntent("日麻战绩查询").confidence).toBe("high");
    });

    it("returns medium confidence for context-based routing", () => {
      const history = [
        {
          role: "assistant" as const,
          content: "桌游",
          metadata: '{"skillId":"boardgame"}',
        },
      ];
      expect(detectIntent("更多", history).confidence).toBe("medium");
    });

    it("returns low confidence for greetings and empty", () => {
      expect(detectIntent("你好").confidence).toBe("low");
      expect(detectIntent("").confidence).toBe("low");
      expect(detectIntent("今天天气").confidence).toBe("low");
    });
  });
});
