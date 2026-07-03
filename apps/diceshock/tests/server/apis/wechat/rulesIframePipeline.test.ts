/**
 * Integration test: rules search → reference page → iframe source resolution
 *
 * Exercises the full pipeline:
 *   1. User asks "火球术怎么用" in WeChat
 *   2. AI Search returns rule chunks with R2 keys
 *   3. search_rules resolves originalUrl for each chunk
 *   4. createReference stores the data in KV with originalUrl
 *   5. shortlinkReferenceData returns data with originalUrl for the SPA
 *   6. Client renders iframe cards pointing to original source sites
 *
 * All external I/O (AI Search, KV, LLM) is mocked with captured real data.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolveSourceUrl } from "@/server/utils/rulesSourceUrl";
import { createReference } from "@/server/apis/referenceCreate";
import type { ReferencePageData } from "@/server/apis/shortlink";

// ─── Captured real AI Search response (truncated for test) ──────────────────
const CAPTURED_AI_SEARCH_RESPONSE = {
	chunks: [
		{
			text: `## 火球术 Fireball

3环 塑能

**施法时间:** 1 动作
**射程:** 150尺
**成分:** 语言、姿势、材料（一小团蝙蝠粪和硫磺）
**持续时间:** 即时

你从指尖射出一枚明亮的光点。光点飞向射程内你选定的一点后绽放为低沉的火焰咆哮。以该点为中心，半径20尺的球状区域内的每个生物必须进行一次敏捷豁免。豁免失败者受8d6点火焰伤害，成功则伤害减半。

火焰绕过拐角蔓延。它会引燃区域内一切未被穿戴或携带的可燃物体。

**升环施法。** 当你使用4环或更高环位施展该法术时，你每使用比3环高一环的法术位，伤害就增加1d6。`,
			item: { key: "5e-rules/topics/玩家手册2024/法术详述/F/火球术.md" },
			score: 0.95,
		},
		{
			text: `## 灼热射线 Scorching Ray

2环 塑能

**施法时间:** 1 动作
**射程:** 120尺
**成分:** 语言、姿势
**持续时间:** 即时

你制造三道灼热的射线，可以射向射程内的目标。你可以将射线射向同一个目标，也可以射向不同的目标。为每道射线进行远程法术攻击。命中时，每道射线造成2d6点火焰伤害。`,
			item: { key: "5e-rules/topics/玩家手册2024/法术详述/S/灼热射线.md" },
			score: 0.72,
		},
		{
			text: `## 延迟爆裂火球 Delayed Blast Fireball

7环 塑能

**施法时间:** 1 动作
**射程:** 150尺
**成分:** 语言、姿势、材料（一小团蝙蝠粪和硫磺）
**持续时间:** 专注，最长1分钟

你从指尖射出一道黄色光芒...`,
			item: { key: "5e-rules/topics/玩家手册2024/法术详述/D/延迟爆裂火球.md" },
			score: 0.61,
		},
	],
};

// Captured AoN response (Pathfinder 2e)
const CAPTURED_AON_SEARCH_RESPONSE = {
	chunks: [
		{
			text: `## Fireball

**Traditions** arcane, primal
**Cast** [two-actions] somatic, verbal
**Range** 500 feet; **Area** 20-foot burst
**Saving Throw** basic Reflex

A roaring blast of fire appears at a spot you designate, dealing 6d6 fire damage.`,
			item: { key: "pf2-rules/342-fireball.md" },
			score: 0.88,
		},
	],
};

// ─── Mock KV store ─────────────────────────────────────────────────────────

function createMockKV(): KVNamespace {
	const store = new Map<string, string>();
	return {
		get: vi.fn(async (key: string) => store.get(key) ?? null),
		put: vi.fn(async (key: string, value: string) => {
			store.set(key, value);
		}),
		delete: vi.fn(async (key: string) => {
			store.delete(key);
		}),
		list: vi.fn(),
		getWithMetadata: vi.fn(),
	} as unknown as KVNamespace;
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("rules iframe pipeline", () => {
	describe("Step 1: resolveSourceUrl maps R2 keys to original URLs", () => {
		it("resolves 5e-rules key from captured fireball result", () => {
			const key = "5e-rules/topics/玩家手册2024/法术详述/F/火球术.md";
			const url = resolveSourceUrl(key);
			expect(url).toBe(
				"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/F/火球术.html",
			);
		});

		it("resolves pf2 key from captured AoN result", () => {
			const key = "pf2-rules/342-fireball.md";
			const url = resolveSourceUrl(key);
			expect(url).toBe("https://2e.aonprd.com/Rules.aspx?ID=342");
		});

		it("preserves Chinese path segments in 5e URLs", () => {
			const key = "5e-rules/topics/玩家手册2024/法术详述/S/灼热射线.md";
			const url = resolveSourceUrl(key);
			expect(url).toBe(
				"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/S/灼热射线.html",
			);
		});
	});

	describe("Step 2: search_rules adds originalUrl to results", () => {
		it("builds results with originalUrl from AI Search chunks", async () => {
			// Simulate what executeSearchRules does with the captured response
			const chunks = CAPTURED_AI_SEARCH_RESPONSE.chunks.map((chunk) => {
				const source = chunk.item?.key ?? "";
				return {
					text: chunk.text.slice(0, 800),
					source,
					originalUrl: resolveSourceUrl(source),
					score: chunk.score,
				};
			});

			expect(chunks).toHaveLength(3);
			expect(chunks[0]).toMatchObject({
				source: "5e-rules/topics/玩家手册2024/法术详述/F/火球术.md",
				originalUrl:
					"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/F/火球术.html",
				score: 0.95,
			});
			expect(chunks[1]!.originalUrl).toBe(
				"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/S/灼热射线.html",
			);
			expect(chunks[2]!.originalUrl).toBe(
				"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/D/延迟爆裂火球.html",
			);
		});

		it("handles mixed 5e + AoN results", () => {
			const allChunks = [
				...CAPTURED_AI_SEARCH_RESPONSE.chunks,
				...CAPTURED_AON_SEARCH_RESPONSE.chunks,
			];

			const results = allChunks.map((chunk) => ({
				source: chunk.item.key,
				originalUrl: resolveSourceUrl(chunk.item.key),
			}));

			// 5e results → 5echm.kagangtuya.top
			expect(results[0]!.originalUrl).toContain("5echm.kagangtuya.top");
			// AoN result → 2e.aonprd.com
			expect(results[3]!.originalUrl).toBe(
				"https://2e.aonprd.com/Rules.aspx?ID=342",
			);
		});
	});

	describe("Step 3: createReference stores data with originalUrl in KV", () => {
		let kv: KVNamespace;

		beforeEach(() => {
			kv = createMockKV();
		});

		it("stores reference with originalUrl in references array", async () => {
			const references = CAPTURED_AI_SEARCH_RESPONSE.chunks.map((chunk) => ({
				text: chunk.text.slice(0, 800),
				source: chunk.item.key,
				originalUrl: resolveSourceUrl(chunk.item.key),
				score: chunk.score,
			}));

			const { slug, url } = await createReference(kv, {
				userQuery: "火球术怎么用",
				agentReply:
					"火球术是3环塑能法术，射程150尺，造成8d6火焰伤害（半径20尺球形区域）。",
				references,
			});

			expect(slug).toMatch(/^ref-/);
			expect(url).toBe(`https://diceshock.com/x/${slug}`);

			// Verify KV stored the data correctly
			const stored = await kv.get(`shortlink:${slug}`);
			expect(stored).toBeTruthy();

			const parsed = JSON.parse(stored!) as ReferencePageData;
			expect(parsed.type).toBe("reference");
			expect(parsed.userQuery).toBe("火球术怎么用");
			expect(parsed.references).toHaveLength(3);
			expect(parsed.references[0]).toMatchObject({
				source: "5e-rules/topics/玩家手册2024/法术详述/F/火球术.md",
				originalUrl:
					"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/F/火球术.html",
				score: 0.95,
			});
			// All references have originalUrl
			for (const ref of parsed.references) {
				expect(ref.originalUrl).toBeTruthy();
				expect(ref.originalUrl).toMatch(/^https:\/\//);
			}
		});

		it("KV data has 72h TTL", async () => {
			const references = [
				{
					text: "test",
					source: "5e-rules/topics/test.md",
					originalUrl: "https://5echm.kagangtuya.top/topics/test.html",
					score: 0.9,
				},
			];

			await createReference(kv, {
				userQuery: "test",
				agentReply: "reply",
				references,
			});

			// Verify put was called with TTL
			expect(kv.put).toHaveBeenCalledWith(
				expect.stringMatching(/^shortlink:ref-/),
				expect.any(String),
				{ expirationTtl: 72 * 60 * 60 },
			);
		});
	});

	describe("Step 4: shortlinkReferenceData returns iframe-ready data", () => {
		it("returns reference data with originalUrl for client rendering", async () => {
			const kv = createMockKV();

			// Store a reference (simulating what WechatAgentDO does)
			const references = CAPTURED_AI_SEARCH_RESPONSE.chunks.map((chunk) => ({
				text: chunk.text.slice(0, 800),
				source: chunk.item.key,
				originalUrl: resolveSourceUrl(chunk.item.key),
				score: chunk.score,
			}));

			const { slug } = await createReference(kv, {
				userQuery: "火球术怎么用",
				agentReply: "火球术是3环塑能法术...",
				references,
			});

			// Read it back (simulating GET /edge/shortlink/:id/data)
			const raw = await kv.get(`shortlink:${slug}`);
			const data = JSON.parse(raw!) as ReferencePageData;

			// Client will use originalUrl to render iframes
			expect(data.references[0]!.originalUrl).toBe(
				"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/F/火球术.html",
			);
			expect(data.references[1]!.originalUrl).toBe(
				"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/S/灼热射线.html",
			);
			expect(data.references[2]!.originalUrl).toBe(
				"https://5echm.kagangtuya.top/topics/玩家手册2024/法术详述/D/延迟爆裂火球.html",
			);
		});
	});

	describe("Step 5: iframe target URLs are accessible sites", () => {
		const ALLOWED_IFRAME_ORIGINS = [
			"https://5echm.kagangtuya.top",
			"https://2e.aonprd.com",
			"https://aonprd.com",
			"https://aonsrd.com",
		];

		it("all resolved URLs point to allowed iframe origins", () => {
			const allKeys = [
				"5e-rules/topics/玩家手册2024/法术详述/F/火球术.md",
				"5e-rules/topics/玩家手册2024/职业/术士.md",
				"pf2-rules/342-fireball.md",
				"pf1-rules/100-combat.md",
				"sf1-rules/55-starship.md",
			];

			for (const key of allKeys) {
				const url = resolveSourceUrl(key);
				expect(url).toBeTruthy();
				const origin = new URL(url!).origin;
				expect(ALLOWED_IFRAME_ORIGINS).toContain(origin);
			}
		});

		it("5e URLs produce valid page paths (no double slashes, correct extension)", () => {
			const url = resolveSourceUrl(
				"5e-rules/topics/玩家手册2024/法术详述/F/火球术.md",
			);
			expect(url).not.toContain("//topics");
			expect(url).toMatch(/\.html$/);
			expect(url).not.toContain(".md");
		});

		it("AoN URLs produce valid Rules.aspx?ID= format", () => {
			const url = resolveSourceUrl("pf2-rules/342-fireball.md");
			expect(url).toMatch(/Rules\.aspx\?ID=\d+$/);
		});
	});

	describe("Step 6: backward compatibility with old data (no originalUrl)", () => {
		it("reference page gracefully handles missing originalUrl", () => {
			// Old data from before the migration
			const legacyRef = {
				text: "Some rule text from before the migration",
				source: "dnd.md",
				score: 0.9,
			};

			// resolveSourceUrl returns null for unrecognized keys
			const url = resolveSourceUrl(legacyRef.source);
			expect(url).toBeNull();

			// Client should fall back to text display (not iframe)
			// This is verified by the component logic: hasIframe = !!ref_.originalUrl
			const hasIframe = !!url;
			expect(hasIframe).toBe(false);
		});
	});
});
