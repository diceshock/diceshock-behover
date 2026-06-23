import { test, expect } from "../fixtures/vibe.fixture";
import { allJourneys, featureCatalog, type CoverageMode } from "../scenarios/feature-catalog";

const requiredCoverageModes: CoverageMode[] = ["agent", "page", "api", "queue", "cron", "subscription"];

test.describe("complete feature catalog contract", () => {
  test("enumerates every functional project with executable journey metadata", async () => {
    expect(featureCatalog).toHaveLength(18);

    for (const feature of featureCatalog) {
      await test.step(feature.id, async () => {
        expect(feature.id).toMatch(/^[a-z0-9-]+$/);
        expect(feature.name.length).toBeGreaterThan(4);
        expect(feature.sourceFiles.length).toBeGreaterThan(0);
        expect(feature.journeys.length).toBeGreaterThan(0);

        for (const journey of feature.journeys) {
          expect(journey.id).toMatch(/^[a-z0-9-]+$/);
          expect(journey.goal.length).toBeGreaterThan(20);
          expect(journey.entrypoints.length).toBeGreaterThan(0);
          expect(journey.coverage.length).toBeGreaterThan(0);
          expect(journey.realisticPrompt.length).toBeGreaterThan(10);
          expect(journey.acceptance.length).toBeGreaterThan(1);
        }
      });
    }
  });

  test("covers all required execution surfaces for vibe coding", () => {
    const covered = new Set(allJourneys().flatMap((journey) => journey.coverage));
    for (const mode of requiredCoverageModes) {
      expect(covered.has(mode), `missing ${mode} journey coverage`).toBeTruthy();
    }
  });

  test("P0 business loops have page or agent execution plus API assertions", () => {
    const p0Features = featureCatalog.filter((feature) => feature.priority === "P0");
    expect(p0Features.map((feature) => feature.id).sort()).toEqual([
      "auth-rbac",
      "orders-settlement",
      "tables-seats",
      "wechat-ai-agent",
    ]);

    for (const feature of p0Features) {
      const featureCoverage = new Set(feature.journeys.flatMap((journey) => journey.coverage));
      expect(featureCoverage.has("api"), `${feature.id} must assert API/backend state`).toBeTruthy();
      expect(
        featureCoverage.has("page") || featureCoverage.has("agent"),
        `${feature.id} must execute a user-visible page or agent flow`,
      ).toBeTruthy();
    }
  });
});
