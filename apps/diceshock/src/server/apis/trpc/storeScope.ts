export function storeFilter(
  table: { store_id: any },
  storeCode?: string,
  eq?: (left: any, right: string) => any,
) {
  return storeCode ? eq?.(table.store_id, storeCode) : undefined;
}
