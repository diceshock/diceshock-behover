import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import type { KeyboardEvent } from "react";
import {
  type ParsedSearch,
  parseSearch,
  type SearchGrammar,
} from "@/client/lib/searchParser";

export interface SearchBarProps {
  grammar: SearchGrammar;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (parsed: ParsedSearch) => void;
  placeholder?: string;
  errors?: string[];
}

export function SearchBar({
  grammar,
  value,
  onChange,
  onSubmit,
  placeholder = "Search…",
  errors = [],
}: SearchBarProps) {
  const parsed = parseSearch(value, grammar);
  const parserErrors = parsed.errors.map((error) => error.message);
  const visibleErrors = [...parserErrors, ...errors];

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;

    const next = parseSearch(value, grammar);
    if (next.errors.length === 0) onSubmit(next);
  };

  return (
    <div className="w-full">
      <label className="input input-bordered w-full flex items-center gap-2">
        <MagnifyingGlassIcon className="size-4 text-base-content/50" />
        <input
          type="search"
          className="grow"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      {visibleErrors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {visibleErrors.map((error) => (
            <span
              key={error}
              className="badge badge-error badge-outline badge-sm"
            >
              {error}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
