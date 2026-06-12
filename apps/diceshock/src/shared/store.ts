import z from "zod/v4";

/** 可选的店铺标识 */
export const STORES = ["guanggu", "jiedaokou"] as const;
export type StoreId = (typeof STORES)[number];

/** 含 legacy 的数据库级别店铺标识 */
export const STORE_VALUES = ["guanggu", "jiedaokou", "legacy"] as const;
export type StoreValue = (typeof STORE_VALUES)[number];

/** 店铺显示名称 */
export const STORE_LABELS: Record<StoreId, string> = {
  guanggu: "光谷店",
  jiedaokou: "街道口店",
};

/** 店铺短标签（用于徽章） */
export const STORE_SHORT_LABELS: Record<StoreId, string> = {
  guanggu: "光谷",
  jiedaokou: "街道口",
};

/** 默认店铺 */
export const DEFAULT_STORE: StoreId = "jiedaokou";

/** Zod schema for route param validation */
export const storeParamZ = z.enum(STORES);

/** Zod schema for tRPC input (数据库级别) */
export const storeValueZ = z.enum(STORE_VALUES);

/** Zod schema for tRPC query input (查询某店铺数据) */
export const storeInputZ = z.enum(STORES);

/**
 * 给定一个店铺 ID，返回用于数据库查询的过滤条件值集合。
 * legacy 数据在所有店铺都展示。
 */
export function getStoreFilter(store: StoreId): StoreValue[] {
  return [store, "legacy"];
}

/** 校验 store 参数是否合法 */
export function isValidStore(value: string): value is StoreId {
  return STORES.includes(value as StoreId);
}
