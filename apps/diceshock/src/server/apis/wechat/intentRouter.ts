import { skillRegistry } from "./skills";
import type { ChatMessage, SkillId } from "./types";

export interface IntentResult {
  skillId: SkillId;
  confidence: "high" | "medium" | "low";
}

type SkillScore = {
  skillId: SkillId;
  score: number;
};

const CONTEXT_MESSAGE_LIMIT = 3;

const FOLLOW_UP_WORDS = ["还有吗", "继续", "还有", "然后呢", "再来", "更多"];
const GREETINGS = ["你好", "您好", "hi", "hello", "嗨"];

export function detectIntent(
  userMessage: string,
  conversationHistory?: ChatMessage[],
): IntentResult {
  const normalizedMessage = normalizeText(userMessage);

  if (!normalizedMessage) {
    return { skillId: "general", confidence: "low" };
  }

  const messageScores = scoreSkills(normalizedMessage);
  const explicitSkill = getClearWinner(messageScores, normalizedMessage);

  if (explicitSkill) {
    return { skillId: explicitSkill, confidence: "high" };
  }

  if (isGreeting(normalizedMessage)) {
    return { skillId: "general", confidence: "low" };
  }

  const contextSkill = detectContextSkill(conversationHistory);

  if (contextSkill) {
    return { skillId: contextSkill, confidence: "medium" };
  }

  if (isFollowUp(normalizedMessage)) {
    return { skillId: "general", confidence: "low" };
  }

  return { skillId: "general", confidence: "low" };
}

function detectContextSkill(
  conversationHistory: ChatMessage[] | undefined,
): SkillId | undefined {
  if (!conversationHistory?.length) {
    return undefined;
  }

  const recentAssistantMessages = conversationHistory
    .filter((message) => message.role === "assistant")
    .slice(-CONTEXT_MESSAGE_LIMIT)
    .reverse();

  for (const message of recentAssistantMessages) {
    const metadataSkill = getMetadataSkillId(message.metadata);

    if (metadataSkill && metadataSkill !== "general") {
      return metadataSkill;
    }
  }

  const contextText = recentAssistantMessages
    .map((message) => message.content)
    .join("\n");
  const contextScores = scoreSkills(contextText);

  return getClearWinner(contextScores, normalizeText(contextText));
}

function scoreSkills(text: string): SkillScore[] {
  const normalizedText = normalizeText(text);

  return [...skillRegistry.entries()].map(([skillId, skill]) => ({
    skillId,
    score: skill.keywords.reduce(
      (score, keyword) =>
        normalizedText.includes(normalizeText(keyword)) ? score + 1 : score,
      0,
    ),
  }));
}

function getClearWinner(
  scores: SkillScore[],
  normalizedMessage: string,
): SkillId | undefined {
  const activeEventWinner = resolveActiveEventOverlap(
    scores,
    normalizedMessage,
  );

  if (activeEventWinner) {
    return activeEventWinner;
  }

  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const [winner, runnerUp] = sortedScores;

  if (!winner || winner.score === 0) {
    return undefined;
  }

  if (runnerUp && winner.score === runnerUp.score) {
    return undefined;
  }

  return winner.skillId;
}

function resolveActiveEventOverlap(
  scores: SkillScore[],
  normalizedMessage: string,
): SkillId | undefined {
  const activeScore = getScore(scores, "active");
  const eventScore = getScore(scores, "event");
  const topScore = Math.max(...scores.map((score) => score.score));

  if (
    topScore === 0 ||
    activeScore !== eventScore ||
    activeScore !== topScore
  ) {
    return undefined;
  }

  const activeSkill = skillRegistry.get("active");
  const hasActiveContext =
    activeSkill?.keywords.some((keyword) =>
      normalizedMessage.includes(normalizeText(keyword)),
    ) || normalizedMessage.includes("约");

  return hasActiveContext ? "active" : "event";
}

function getScore(scores: SkillScore[], skillId: SkillId): number {
  return scores.find((score) => score.skillId === skillId)?.score ?? 0;
}

function getMetadataSkillId(metadata: string | undefined): SkillId | undefined {
  if (!metadata) {
    return undefined;
  }

  if (isSkillId(metadata)) {
    return metadata;
  }

  try {
    const parsedMetadata = JSON.parse(metadata) as { skillId?: unknown };

    return typeof parsedMetadata.skillId === "string" &&
      isSkillId(parsedMetadata.skillId)
      ? parsedMetadata.skillId
      : undefined;
  } catch {
    return undefined;
  }
}

function isSkillId(value: string): value is SkillId {
  return skillRegistry.has(value as SkillId);
}

function isFollowUp(normalizedMessage: string): boolean {
  return FOLLOW_UP_WORDS.some((word) => normalizedMessage.includes(word));
}

function isGreeting(normalizedMessage: string): boolean {
  return GREETINGS.includes(normalizedMessage);
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}
