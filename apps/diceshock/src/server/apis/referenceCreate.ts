import { nanoid } from "nanoid";
import type { ReferencePageData } from "./shortlink";
import { KV_INDEX_PREFIX, KV_PREFIX, SLUG_REGEX } from "./shortlink";

const SEVENTY_TWO_HOURS_IN_SECONDS = 72 * 60 * 60;

export interface CreateReferenceParams {
  userQuery: string;
  agentReply: string;
  references: Array<{
    text: string;
    source: string;
    score: number;
  }>;
  slug?: string;
}

export async function createReference(
  kv: KVNamespace,
  params: CreateReferenceParams,
): Promise<{ slug: string; url: string }> {
  const slug = params.slug || `ref-${nanoid(8)}`;

  if (!SLUG_REGEX.test(slug)) {
    throw new Error("invalid slug");
  }

  const now = Date.now();
  const data: ReferencePageData = {
    type: "reference",
    userQuery: params.userQuery,
    agentReply: params.agentReply,
    references: params.references,
    createdAt: now,
    expiresAt: now + SEVENTY_TWO_HOURS_IN_SECONDS * 1000,
  };

  await kv.put(`${KV_PREFIX}${slug}`, JSON.stringify(data), {
    expirationTtl: SEVENTY_TWO_HOURS_IN_SECONDS,
  });

  await kv.put(
    `${KV_INDEX_PREFIX}${slug}`,
    JSON.stringify({
      slug,
      type: "reference",
      createdAt: now,
      expiresAt: data.expiresAt,
    }),
  );

  return {
    slug,
    url: `https://diceshock.com/x/${slug}`,
  };
}
