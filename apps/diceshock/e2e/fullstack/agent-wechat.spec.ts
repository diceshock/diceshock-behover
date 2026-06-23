import { test, expect } from "../fixtures/vibe.fixture";
import { allJourneys } from "../scenarios/feature-catalog";

test.describe("LLM-simulated customer agent journeys", () => {
  const agentJourneys = allJourneys().filter((journey) => journey.coverage.includes("agent"));

  for (const journey of agentJourneys) {
    test(`customer simulator creates a realistic step: ${journey.id}`, async ({ customerAgent, personas, wechat }) => {
      const persona = personas[0];
      const step = await customerAgent.generateStep(persona, journey);

      expect(step.message).toContain(persona.displayName);
      expect(step.intent.length).toBeGreaterThan(10);
      expect(step.message.length).toBeGreaterThan(10);

      const xml = wechat.buildTextXml({ content: step.message, fromUser: `open_${journey.id}` });
      expect(xml).toContain("<MsgType><![CDATA[text]]></MsgType>");
      expect(xml).toContain("<Content><![CDATA[");
    });
  }

  for (const journey of agentJourneys) {
    test(`WeChat HTTP boundary accepts realistic callback: ${journey.id}`, async ({ customerAgent, personas, wechat }) => {
      const step = await customerAgent.generateStep(personas[0], journey);
      const reply = await wechat.sendText({
        content: step.message,
        fromUser: `open_vibe_${journey.id.replace(/-/g, "_")}`,
        msgId: `vibe-${journey.id}-${Date.now()}`,
      });

      expect(reply.trim().length).toBeGreaterThan(0);
      expect(reply).not.toContain("Internal Server Error");
      expect(reply).not.toContain("<!DOCTYPE html>");
      expect(reply).toMatch(/收到|success|xml|请输入|处理中/i);
    });
  }
});
