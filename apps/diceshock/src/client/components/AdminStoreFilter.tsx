import { useAdminStoreFilter } from "@/client/hooks/useAdminStoreFilter";
import { STORES } from "@/shared/store-locale";

export default function AdminStoreFilter() {
  const { storeFilter, setStoreFilter } = useAdminStoreFilter();

  return (
    <select
      className="select select-bordered select-sm"
      value={storeFilter ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        setStoreFilter(val === "" ? null : (val as "gg" | "jdk"));
      }}
    >
      <option value="">所有店铺</option>
      {Object.values(STORES).map((store) => (
        <option key={store.code} value={store.code}>
          {store.shortName}
        </option>
      ))}
    </select>
  );
}
