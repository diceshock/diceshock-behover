import { useParams } from "@tanstack/react-router";
import type { StoreId } from "@/shared/store";
import { DEFAULT_STORE, isValidStore } from "@/shared/store";

/**
 * 从当前路由参数中获取 store 标识。
 * 如果当前路由不在 $store 路径下（如 /t, /ready），返回默认店铺。
 */
export function useCurrentStore(): StoreId {
  const params = useParams({ strict: false }) as Record<string, string>;
  const store = params?.store;
  if (store && isValidStore(store)) {
    return store;
  }
  return DEFAULT_STORE;
}
