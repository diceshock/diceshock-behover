import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { STORES, type StoreCode } from "@/shared/store-locale";

export default function AdminStoreFilter() {
  const { storeFilter, setStoreFilter } = useAdminStoreFilter();

  return (
    <select
      className="select select-bordered select-sm"
      value={storeFilter}
      onChange={(e) => setStoreFilter(e.target.value as StoreCode)}
    >
      {Object.values(STORES).map((store) => (
        <option key={store.code} value={store.code}>
          {store.shortName}
        </option>
      ))}
    </select>
  );
}
