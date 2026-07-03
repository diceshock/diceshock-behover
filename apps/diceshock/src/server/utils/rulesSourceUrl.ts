/**
 * Maps R2 keys / AI Search source filenames back to their original crawl-source URLs.
 *
 * Key patterns:
 *   5e-rules/topics/xxx.html → md stored as topics/xxx.md
 *   pf2-rules/123-slug.md   → https://2e.aonprd.com/Rules.aspx?ID=123
 *   pf1-rules/123-slug.md   → https://aonprd.com/Rules.aspx?ID=123
 *   sf1-rules/123-slug.md   → https://aonsrd.com/Rules.aspx?ID=123
 */

const SITE_MAP: Record<string, string> = {
	"pf2-rules": "https://2e.aonprd.com",
	"pf1-rules": "https://aonprd.com",
	"sf1-rules": "https://aonsrd.com",
};

const FIVE_E_BASE = "https://5echm.kagangtuya.top/";

/**
 * Resolve an AI Search `source` field (R2 key or filename) to the original URL.
 * Returns null if the format is unrecognized.
 */
export function resolveSourceUrl(source: string): string | null {
	if (!source) return null;

	// Normalize: strip leading "5e-rules/", "pf2-rules/", etc. prefix OR treat as bare filename
	const normalized = source.replace(/^\/+/, "");

	// ─── 5E rules ─────────────────────────────────────────────────────
	if (normalized.startsWith("5e-rules/")) {
		// 5e-rules/topics/xxx.md → topics/xxx.html
		const path = normalized
			.replace("5e-rules/", "")
			.replace(/\.md$/i, ".html");
		return `${FIVE_E_BASE}${path}`;
	}

	// Bare 5E filename (no prefix) from AI Search which strips the prefix
	if (normalized.startsWith("topics/") || normalized.startsWith("scr/")) {
		const path = normalized.replace(/\.md$/i, ".html");
		return `${FIVE_E_BASE}${path}`;
	}

	// ─── AoN rules (PF2, PF1, SF1) ───────────────────────────────────
	for (const [prefix, baseUrl] of Object.entries(SITE_MAP)) {
		if (normalized.startsWith(`${prefix}/`)) {
			const filename = normalized.replace(`${prefix}/`, "");
			return resolveAonUrl(baseUrl, filename);
		}
	}

	// Bare AoN filename: "123-slug.md"
	const idMatch = normalized.match(/^(\d+)-/);
	if (idMatch) {
		// Can't determine which site without prefix — default to PF2 as most common
		return resolveAonUrl(SITE_MAP["pf2-rules"], normalized);
	}

	return null;
}

function resolveAonUrl(baseUrl: string, filename: string): string | null {
	// filename: "123-slug.md" → ID=123
	const match = filename.match(/^(\d+)-/);
	if (!match) return null;
	return `${baseUrl}/Rules.aspx?ID=${match[1]}`;
}
