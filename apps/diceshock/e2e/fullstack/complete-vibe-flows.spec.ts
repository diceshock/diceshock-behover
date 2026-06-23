import { test, expect } from "../fixtures/vibe.fixture";
import { featureCatalog } from "../scenarios/feature-catalog";

test.describe("complete vibe-coding journey generation", () => {
  for (const feature of featureCatalog) {
    test(`${feature.id}: every journey has an executable simulated customer/system step`, async ({ customerAgent, personas }) => {
      const persona = feature.journeys.some((journey) => journey.actor === "staff" || journey.actor === "admin")
        ? personas.find((item) => item.id === "staff-operator") ?? personas[0]
        : personas[0];

      for (const journey of feature.journeys) {
        const step = await customerAgent.generateStep(persona, journey);
        expect(step.intent.length).toBeGreaterThan(10);
        expect(step.message).not.toBe(journey.goal);
        expect(step.message).not.toBe(journey.realisticPrompt);
        expect(hasPromptSignal(step.message, journey.realisticPrompt)).toBeTruthy();
        expect(["wechat", "page", "graphql", "queue", "cron", "subscription"]).toContain(step.expectedSurface);
      }
    });
  }
});

function hasPromptSignal(message: string, prompt: string): boolean {
  const normalizedMessage = message.toLowerCase();
  const fragments = prompt
    .split(/[，。！？、\s,.!?]+/)
    .map((part) => part.trim().toLowerCase())
    .filter((part) => part.length >= 2);

  if (fragments.some((fragment) => normalizedMessage.includes(fragment))) return true;

  const uniquePromptChars = [...new Set([...prompt].filter((char) => /[\p{L}\p{N}]/u.test(char)))];
  const overlap = uniquePromptChars.filter((char) => normalizedMessage.includes(char.toLowerCase())).length;
  return overlap >= Math.min(4, uniquePromptChars.length);
}
