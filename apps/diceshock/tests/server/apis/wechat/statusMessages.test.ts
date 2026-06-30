import { describe, expect, it } from "vitest";
import {
  CONTACT_INFO,
  ERROR_MESSAGES,
  getToolStatusMessage,
  STATUS_MESSAGES,
} from "@/server/apis/wechat/statusMessages";

describe("getToolStatusMessage", () => {
  describe("boardgame tool mappings", () => {
    it("maps board game inventory queries", () => {
      expect(getToolStatusMessage("query_board_game_inventory")).toContain(
        "桌游",
      );
      expect(getToolStatusMessage("query_board_game_count")).toContain("桌游");
      expect(getToolStatusMessage("query_board_game_detail")).toContain("桌游");
      expect(getToolStatusMessage("query_board_game_filter")).toContain("桌游");
    });
  });

  describe("membership tool mappings", () => {
    it("maps membership status queries", () => {
      expect(getToolStatusMessage("query_membership_status")).toContain("会员");
      expect(getToolStatusMessage("query_all_membership_plans")).toContain(
        "会员",
      );
      expect(getToolStatusMessage("get_user_profile")).toContain("会员");
      expect(getToolStatusMessage("get_my_business_card")).toContain("会员");
    });
  });

  describe("mahjong tool mappings", () => {
    it("maps mahjong data queries", () => {
      expect(getToolStatusMessage("query_leaderboard")).toContain("日麻");
      expect(getToolStatusMessage("query_my_rankings")).toContain("日麻");
      expect(getToolStatusMessage("query_my_match_history")).toContain("日麻");
      expect(getToolStatusMessage("query_my_pp_stats")).toContain("日麻");
      expect(getToolStatusMessage("query_my_badges")).toContain("日麻");
    });
  });

  describe("active tool mappings", () => {
    it("maps active queries", () => {
      expect(getToolStatusMessage("query_actives_list")).toContain("约局");
      expect(getToolStatusMessage("query_active_detail")).toContain("约局");
      expect(getToolStatusMessage("query_active_notifications")).toContain(
        "约局",
      );
    });
  });

  describe("event tool mappings", () => {
    it("maps event queries", () => {
      expect(getToolStatusMessage("query_events_list")).toContain("活动");
      expect(getToolStatusMessage("query_event_detail")).toContain("活动");
    });
  });

  describe("other tool mappings", () => {
    it("maps table queries", () => {
      expect(getToolStatusMessage("query_my_active_table")).toContain("桌台");
    });

    it("maps TOTP generation", () => {
      expect(getToolStatusMessage("generate_totp")).toContain("验证码");
    });
  });

  describe("fallback for unknown tools", () => {
    it("returns THINKING for unmapped tools", () => {
      expect(getToolStatusMessage("unknown_tool")).toBe(
        STATUS_MESSAGES.THINKING,
      );
      expect(getToolStatusMessage("some_random_function")).toBe(
        STATUS_MESSAGES.THINKING,
      );
    });

    it("returns THINKING for empty string", () => {
      expect(getToolStatusMessage("")).toBe(STATUS_MESSAGES.THINKING);
    });
  });
});

describe("ERROR_MESSAGES", () => {
  it("all error messages are defined", () => {
    expect(ERROR_MESSAGES.SERVER_ERROR).toBeDefined();
    expect(ERROR_MESSAGES.BUSY).toBeDefined();
    expect(ERROR_MESSAGES.RATE_LIMITED).toBeDefined();
    expect(ERROR_MESSAGES.TEXT_ONLY).toBeDefined();
    expect(ERROR_MESSAGES.AI_UNAVAILABLE).toBeDefined();
    expect(ERROR_MESSAGES.UNKNOWN_ERROR).toBeDefined();
  });

  it("SERVER_ERROR contains contact info", () => {
    expect(ERROR_MESSAGES.SERVER_ERROR).toContain(CONTACT_INFO);
  });

  it("BUSY contains contact info", () => {
    expect(ERROR_MESSAGES.BUSY).toContain(CONTACT_INFO);
  });

  it("RATE_LIMITED contains contact info", () => {
    expect(ERROR_MESSAGES.RATE_LIMITED).toContain(CONTACT_INFO);
  });

  it("AI_UNAVAILABLE contains contact info", () => {
    expect(ERROR_MESSAGES.AI_UNAVAILABLE).toContain(CONTACT_INFO);
  });

  it("UNKNOWN_ERROR contains contact info", () => {
    expect(ERROR_MESSAGES.UNKNOWN_ERROR).toContain(CONTACT_INFO);
  });

  it("TEXT_ONLY does NOT contain contact info (intentional)", () => {
    expect(ERROR_MESSAGES.TEXT_ONLY).not.toContain(CONTACT_INFO);
  });
});

describe("STATUS_MESSAGES", () => {
  it("all status messages are defined Chinese strings", () => {
    const values = Object.values(STATUS_MESSAGES);
    expect(values.length).toBeGreaterThanOrEqual(8);
    for (const msg of values) {
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("THINKING is set correctly", () => {
    expect(STATUS_MESSAGES.THINKING).toBe("正在回复...");
  });

  it("QUERYING_INVENTORY is set correctly", () => {
    expect(STATUS_MESSAGES.QUERYING_INVENTORY).toBe("正在查询桌游库存...");
  });
});
