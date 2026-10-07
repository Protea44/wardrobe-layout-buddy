import { Search } from "lucide-react";
import { useEffect, useId, useState } from "react";

import type { ItemSort } from "@shared/item";

import { SEARCH_DEBOUNCE_MS, sortOptions } from "@/config/wardrobe";
import { itemCountLabel } from "@/lib/wardrobe-search";

type WardrobeToolbarProps = {
  query: string;
  sort: ItemSort;
  // Null while the first page is loading.
  total: number | null;
  onQueryChange: (query: string) => void;
  onSortChange: (sort: ItemSort) => void;
};

export function WardrobeToolbar({
  query,
  sort,
  total,
  onQueryChange,
  onSortChange,
}: WardrobeToolbarProps) {
  const id = useId();
  const [text, setText] = useState(query);

  // Follows the URL, e.g. after back navigation or "Alle zurücksetzen".
  useEffect(() => setText(query), [query]);

  // Searches once typing pauses.
  useEffect(() => {
    if (text.trim() === query) return;
    const timer = setTimeout(() => onQueryChange(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, query, onQueryChange]);

  return (
    <div className="wardrobe-toolbar">
      <div className="wardrobe-search">
        <label htmlFor={`${id}-search`} className="sr-only">
          Schrank durchsuchen
        </label>
        <Search aria-hidden="true" className="wardrobe-search-icon" />
        <input
          id={`${id}-search`}
          type="search"
          className="wardrobe-input wardrobe-search-input"
          placeholder="Name, Marke, Material …"
          value={text}
          maxLength={100}
          autoComplete="off"
          enterKeyHint="search"
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div className="wardrobe-toolbar-row">
        <p className="wardrobe-count" aria-live="polite">
          {total === null ? "" : itemCountLabel(total)}
        </p>
        <div className="wardrobe-sort">
          <label htmlFor={`${id}-sort`} className="wardrobe-field-label">
            Sortieren
          </label>
          <select
            id={`${id}-sort`}
            className="wardrobe-input wardrobe-select"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as ItemSort)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
