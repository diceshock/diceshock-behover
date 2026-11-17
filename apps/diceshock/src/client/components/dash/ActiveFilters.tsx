import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { useTranslation } from "@/client/hooks/useTranslation";
import { getCategoryById } from "./launcher/categories";
import { type FilterValue, formatFilterChipLabel } from "./launcher/types";

export function ActiveFilters({
  filters,
  query,
  onChange,
}: {
  filters: FilterValue[];
  query: string;
  onChange: (filters: FilterValue[], query: string) => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(query);
  useEffect(() => setDraft(query), [query]);
  const setFilter = (key: string, value: string) =>
    onChange(
      [
        ...filters.filter((f) => f.key !== key),
        ...(value ? [{ key, value, operator: "eq" as const }] : []),
      ],
      query,
    );
  const status = filters.find((f) => f.key === "status")?.value ?? "";
  const type = filters.find((f) => f.key === "type")?.value ?? "";
  return (
    <section
      className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4"
      aria-label={t("dashActives.filters")}
    >
      <div className="flex flex-wrap items-end gap-3">
        <form
          className="flex min-w-0 flex-1 basis-72 items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onChange(filters, draft.trim());
          }}
        >
          <label
            className="flex min-w-0 flex-1 flex-col gap-1.5"
            htmlFor="active-search"
          >
            <span className="text-sm font-medium">{t("common.search")}</span>
            <input
              id="active-search"
              type="search"
              className="input w-full"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={t("dashActives.searchTitle")}
            />
          </label>
          <button type="submit" className="btn btn-primary">
            <MagnifyingGlassIcon size={18} aria-hidden="true" />
            {t("common.search")}
          </button>
        </form>
        <label className="flex flex-col gap-1.5" htmlFor="active-type">
          <span className="text-sm font-medium">{t("dashActives.type")}</span>
          <select
            id="active-type"
            className="select w-36"
            value={type}
            onChange={(event) => setFilter("type", event.target.value)}
          >
            <option value="">{t("dashActives.statusAll")}</option>
            <option value="game">{t("dashActives.typeGame")}</option>
            <option value="other">{t("dashActives.typeNotGame")}</option>
          </select>
        </label>
        {(filters.length > 0 || query) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setDraft("");
              onChange([], "");
            }}
          >
            {t("dashActives.clearFilters")}
          </button>
        )}
      </div>
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={t("dashActives.status")}
      >
        {[
          ["", "statusAll"],
          ["active", "upcoming"],
          ["expired", "past"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`btn btn-sm min-h-10 ${status === value ? "btn-neutral" : "btn-ghost"}`}
            aria-pressed={status === value}
            onClick={() => setFilter("status", value)}
          >
            {t(`dashActives.${label}`)}
          </button>
        ))}
      </div>
      {filters.some((f) => !["status", "type"].includes(f.key)) && (
        <div className="flex flex-wrap gap-2">
          {filters
            .filter((f) => !["status", "type"].includes(f.key))
            .map((filter) => (
              <button
                key={`${filter.key}:${filter.operator}`}
                type="button"
                className="btn btn-sm btn-soft"
                onClick={() =>
                  onChange(
                    filters.filter((f) => f !== filter),
                    query,
                  )
                }
                aria-label={`${t("dashActives.removeFilter")}: ${formatFilterChipLabel(filter, getCategoryById("actives"))}`}
              >
                {formatFilterChipLabel(filter, getCategoryById("actives"))}
                <XIcon aria-hidden="true" />
              </button>
            ))}
        </div>
      )}
    </section>
  );
}
