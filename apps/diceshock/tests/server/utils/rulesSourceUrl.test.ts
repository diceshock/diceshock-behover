import { describe, expect, it } from "vitest";
import { resolveSourceUrl } from "@/server/utils/rulesSourceUrl";

describe("resolveSourceUrl", () => {
	it("resolves 5e-rules R2 key to original URL", () => {
		expect(resolveSourceUrl("5e-rules/topics/玩家手册2024/xxx.md")).toBe(
			"https://5echm.kagangtuya.top/topics/玩家手册2024/xxx.html",
		);
	});

	it("resolves bare 5e filename (AI Search strips prefix)", () => {
		expect(resolveSourceUrl("topics/魔法物品/圣遗物.md")).toBe(
			"https://5echm.kagangtuya.top/topics/魔法物品/圣遗物.html",
		);
	});

	it("resolves pf2-rules key to aonprd URL", () => {
		expect(resolveSourceUrl("pf2-rules/456-athletics.md")).toBe(
			"https://2e.aonprd.com/Rules.aspx?ID=456",
		);
	});

	it("resolves pf1-rules key", () => {
		expect(resolveSourceUrl("pf1-rules/123-combat-basics.md")).toBe(
			"https://aonprd.com/Rules.aspx?ID=123",
		);
	});

	it("resolves sf1-rules key", () => {
		expect(resolveSourceUrl("sf1-rules/789-starship-combat.md")).toBe(
			"https://aonsrd.com/Rules.aspx?ID=789",
		);
	});

	it("resolves bare AoN filename (defaults to PF2)", () => {
		expect(resolveSourceUrl("100-some-rule.md")).toBe(
			"https://2e.aonprd.com/Rules.aspx?ID=100",
		);
	});

	it("returns null for unrecognized format", () => {
		expect(resolveSourceUrl("random-file.txt")).toBeNull();
		expect(resolveSourceUrl("")).toBeNull();
	});

	it("handles scr/ prefix from 5e", () => {
		expect(resolveSourceUrl("scr/something.md")).toBe(
			"https://5echm.kagangtuya.top/scr/something.html",
		);
	});
});
