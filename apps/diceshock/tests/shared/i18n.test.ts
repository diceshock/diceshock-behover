import { beforeAll, describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatMessage,
  formatNumber,
  formatRelativeTime,
  getAllTranslations,
  getMissingKeys,
  getTranslation,
  SUPPORTED_LOCALES,
  setTranslations,
} from "@/shared/i18n";
import { loadLocale } from "@/shared/i18n/loader";
import type { LocaleCode } from "@/shared/store-locale";

const TEST_LOCALES: LocaleCode[] = [
  "zh_Hans",
  "zh_Hant",
  "en",
  "ja",
  "ru",
  "es",
  "pt",
  "fr",
  "de",
];

beforeAll(async () => {
  await Promise.all(
    TEST_LOCALES.filter((locale) => locale !== "zh_Hans").map(
      async (locale) => {
        setTranslations(locale, await loadLocale(locale));
      },
    ),
  );
});

async function withPartialGermanTranslations(run: () => void): Promise<void> {
  const de = await loadLocale("de");
  setTranslations("de", { nav: { home: "Startseite" } });
  try {
    run();
  } finally {
    setTranslations("de", de);
  }
}

describe("getTranslation", () => {
  it("returns zh_Hans translations", () => {
    expect(getTranslation("zh_Hans", "common.loading")).toBe("加载中...");
  });

  it("returns English translations", () => {
    expect(getTranslation("en", "nav.home")).toBe("Home");
  });

  it("returns Japanese translations", () => {
    expect(getTranslation("ja", "nav.home")).toBe("ホーム");
  });

  it("falls back to zh_Hans when locale key is missing", async () => {
    await withPartialGermanTranslations(() => {
      expect(getTranslation("de", "me.defaultOption")).toBe("不设置");
    });
  });

  it("returns key literal when key is missing everywhere", () => {
    expect(getTranslation("ja", "nonexistent.key")).toBe("nonexistent.key");
  });
});

describe("formatMessage", () => {
  it("formats string variables", () => {
    expect(formatMessage("欢迎, {name}!", { name: "Alice" })).toBe(
      "欢迎, Alice!",
    );
  });

  it("formats numeric variables", () => {
    expect(formatMessage("{count} items", { count: 5 })).toBe("5 items");
  });
});

describe("translation dictionaries", () => {
  it("returns full locale dict", () => {
    const en = getAllTranslations("en");
    expect(en.nav).toMatchObject({ home: "Home" });
  });

  it("reports keys only present in zh_Hans", async () => {
    await withPartialGermanTranslations(() => {
      const missing = getMissingKeys("de");
      expect(missing).toContain("me.defaultOption");
      expect(missing).toContain("me.preferencesSaved");
    });
  });

  it("loads all 9 locales without error", () => {
    expect(SUPPORTED_LOCALES).toHaveLength(9);
    for (const locale of TEST_LOCALES) {
      expect(getAllTranslations(locale)).toBeTruthy();
      expect(getTranslation(locale, "nav.home")).toBeTruthy();
    }
  });
});

describe("getTranslation edge cases", () => {
  it("returns key literal when key missing in both locale and base", () => {
    expect(getTranslation("ja", "nonexistent.key.deep")).toBe(
      "nonexistent.key.deep",
    );
  });

  it("falls back to zh_Hans when locale key is missing", async () => {
    await withPartialGermanTranslations(() => {
      expect(getTranslation("de", "me.defaultOption")).toBe("不设置");
    });
  });

  it("returns base locale value directly from zh_Hans", () => {
    expect(getTranslation("zh_Hans", "common.loading")).toBe("加载中...");
  });
});

describe("getMissingKeys", () => {
  it("returns empty array for base locale itself", () => {
    expect(getMissingKeys("zh_Hans")).toEqual([]);
  });

  it("includes keys present only in zh_Hans", async () => {
    await withPartialGermanTranslations(() => {
      const missing = getMissingKeys("de");
      expect(missing).toContain("me.defaultOption");
      expect(missing).toContain("me.preferencesSaved");
    });
  });

  it("does not include keys that exist in target locale", () => {
    const missing = getMissingKeys("de");
    expect(missing).not.toContain("nav.home");
    expect(missing).not.toContain("common.loading");
  });
});

describe("formatDate", () => {
  const testDate = new Date(2025, 5, 15); // June 15, 2025

  it("formats with medium style for Japanese locale", () => {
    const result = formatDate(testDate, "ja", "medium");
    expect(result).toContain("2025");
    expect(result).toContain("6月");
  });

  it("formats with medium style for English locale", () => {
    const result = formatDate(testDate, "en", "medium");
    expect(result).toContain("June");
    expect(result).toContain("2025");
  });

  it("formats with short style", () => {
    const result = formatDate(testDate, "zh_Hans", "short");
    // short should be something like "6/15"
    expect(result).toContain("6");
  });

  it("formats with long style", () => {
    const result = formatDate(testDate, "zh_Hans", "long");
    expect(result).toContain("2025");
  });

  it("accepts string dates", () => {
    const result = formatDate("2025-06-15", "en", "medium");
    expect(result).toContain("2025");
  });
});

describe("formatNumber", () => {
  it("formats number with Japanese locale", () => {
    const result = formatNumber(1234.5, "ja");
    expect(result).toBe("1,234.5");
  });

  it("formats number with German locale (comma as decimal)", () => {
    const result = formatNumber(1234.5, "de");
    expect(result).toContain("234");
  });

  it("formats large integers", () => {
    const result = formatNumber(1000000, "en");
    expect(result).toBe("1,000,000");
  });
});

describe("formatCurrency", () => {
  it("formats CNY with Chinese locale", () => {
    const result = formatCurrency(99.5, "zh_Hans", "CNY");
    expect(result).toContain("99");
  });

  it("formats CNY with English locale", () => {
    const result = formatCurrency(99.5, "en", "CNY");
    expect(result).toContain("CN¥");
  });

  it("defaults to CNY when no currency specified", () => {
    const result = formatCurrency(50, "zh_Hans");
    expect(result).toBeTruthy();
  });
});

describe("formatRelativeTime", () => {
  it("formats past time with English locale", () => {
    const past = Date.now() - 3 * 24 * 60 * 60 * 1000; // 3 days ago
    const result = formatRelativeTime(past, "en");
    expect(result).toContain("day");
  });

  it("formats past time with Chinese locale", () => {
    const past = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const result = formatRelativeTime(past, "zh_Hans");
    expect(result).toContain("天");
  });

  it("formats seconds for very recent times", () => {
    const recent = Date.now() - 30 * 1000; // 30 seconds ago
    const result = formatRelativeTime(recent, "en");
    expect(result).toContain("second");
  });

  it("formats minutes for times within the hour", () => {
    const past = Date.now() - 10 * 60 * 1000; // 10 minutes ago
    const result = formatRelativeTime(past, "en");
    expect(result).toContain("minute");
  });

  it("formats hours for times within the day", () => {
    const past = Date.now() - 4 * 60 * 60 * 1000; // 4 hours ago
    const result = formatRelativeTime(past, "en");
    expect(result).toContain("hour");
  });
});
