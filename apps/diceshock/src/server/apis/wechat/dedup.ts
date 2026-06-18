const DEDUP_PREFIX = "wechat:dedup:";
const DEDUP_TTL = 60;

export async function isDuplicate(
  kv: KVNamespace,
  msgId: string,
): Promise<boolean> {
  if (!msgId) return false;
  const existing = await kv.get(`${DEDUP_PREFIX}${msgId}`);
  return existing !== null;
}

export async function markProcessed(
  kv: KVNamespace,
  msgId: string,
): Promise<void> {
  if (!msgId) return;
  await kv.put(`${DEDUP_PREFIX}${msgId}`, "1", { expirationTtl: DEDUP_TTL });
}
