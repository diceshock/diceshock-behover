import { gstoneDb, gstoneGamesTable } from "@lib/db";
import { eq } from "drizzle-orm";

export interface GstoneCrawlMessage {
  game_id: number;
}

export interface GstoneImageMessage {
  game_id: number;
  cover_url: string;
}

type GstoneApiResponse = {
  status?: number;
  message?: string;
  msg?: string;
  data?: unknown;
};

type GstoneGameInfo = Record<string, unknown>;

const GSTONE_API_URL = "https://www.gstonegames.com/app/v2/game_info_get/";
const IMAGE_PREFIX = "gstone-images/";
const CDN_BASE = "https://assets.runespark.fun/";

export async function handleGstoneCrawlQueue(
  batch: MessageBatch<GstoneCrawlMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);

  for (const msg of batch.messages) {
    const gameId = Number(msg.body.game_id);
    try {
      await crawlGstoneGame(db, env, gameId);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const now = new Date().toISOString();
      await env.GSTONE_DB.prepare(
        `INSERT INTO games (gstone_id, error, retry_count, created_at, updated_at)
         VALUES (?, ?, 1, ?, ?)
         ON CONFLICT(gstone_id) DO UPDATE SET
           error = excluded.error,
           retry_count = games.retry_count + 1,
           updated_at = excluded.updated_at`,
      )
        .bind(gameId, errMsg, now, now)
        .run();
    }
    msg.ack();
  }
}

export async function handleGstoneImageQueue(
  batch: MessageBatch<GstoneImageMessage>,
  env: Cloudflare.Env,
): Promise<void> {
  const db = gstoneDb(env.GSTONE_DB);

  for (const msg of batch.messages) {
    const { game_id: gameId, cover_url: coverUrl } = msg.body;
    try {
      const r2Url = await cacheCoverImage(env, gameId, coverUrl);
      await db
        .update(gstoneGamesTable)
        .set({ r2_cover_url: r2Url, updated_at: new Date().toISOString() })
        .where(eq(gstoneGamesTable.gstone_id, gameId));
      msg.ack();
    } catch {
      msg.retry();
    }
  }
}

async function crawlGstoneGame(
  db: ReturnType<typeof gstoneDb>,
  env: Cloudflare.Env,
  gameId: number,
): Promise<void> {
  const response = await fetch(GSTONE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: JSON.stringify({ game_id: gameId }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = (await response.json()) as GstoneApiResponse;

  if (result.status !== 200) {
    throw new Error(
      result.message ?? result.msg ?? `API status ${result.status}`,
    );
  }

  const gameInfo = extractGameInfo(result.data);
  const coverUrl = getStringField(gameInfo, ["cover_url", "cover", "image"]);
  const now = new Date().toISOString();

  await db
    .update(gstoneGamesTable)
    .set({
      name: getStringField(gameInfo, ["name", "game_name", "cn_name", "title"]),
      eng_name: getStringField(gameInfo, ["p_name", "eng_name", "en_name"]),
      rating: getNumberField(gameInfo, ["gstone_rating", "rating", "score"]),
      player_num: getArrayField<number>(gameInfo, ["player_num", "players"]),
      category: getArrayField<{ id: number; value: string }>(gameInfo, [
        "category",
        "categories",
      ]),
      description: getStringField(gameInfo, ["description", "desc", "intro"]),
      cover_url: coverUrl,
      full_data: result.data,
      error: null,
      crawled_at: now,
      updated_at: now,
    })
    .where(eq(gstoneGamesTable.gstone_id, gameId));

  if (coverUrl) {
    await env.GSTONE_IMAGE_QUEUE.send({ game_id: gameId, cover_url: coverUrl });
  }
}

function extractGameInfo(data: unknown): GstoneGameInfo {
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  const nested = record.game_info ?? record.info ?? record.game;
  if (nested && typeof nested === "object") return nested as GstoneGameInfo;
  return record;
}

function getStringField(data: GstoneGameInfo, keys: string[]): string | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function getNumberField(data: GstoneGameInfo, keys: string[]): number | null {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function getArrayField<T>(data: GstoneGameInfo, keys: string[]): T[] | null {
  for (const key of keys) {
    const value = data[key];
    if (Array.isArray(value)) return value as T[];
  }
  return null;
}

async function cacheCoverImage(
  env: Cloudflare.Env,
  gameId: number,
  coverUrl: string,
): Promise<string> {
  const key = `${IMAGE_PREFIX}${gameId}.jpg`;
  const existing = await env.R2.head(key);
  if (existing) return `${CDN_BASE}${key}`;

  const image = await fetch(coverUrl);
  if (!image.ok || !image.body) {
    throw new Error(`Image fetch HTTP ${image.status}`);
  }

  await env.R2.put(key, image.body, {
    httpMetadata: {
      contentType: image.headers.get("content-type") ?? "image/jpeg",
    },
  });
  return `${CDN_BASE}${key}`;
}
