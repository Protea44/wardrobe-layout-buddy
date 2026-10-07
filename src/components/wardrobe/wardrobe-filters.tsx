import { SlidersHorizontal, X } from "lucide-react";
import { useId, useState } from "react";

import type { ItemFacets } from "@shared/item";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { filterLabels } from "@/config/wardrobe";
import {
  activeFilters,
  FILTER_KEYS,
  filterValueLabel,
  withoutAllFilters,
  withoutFilter,
  type FilterKey,
  type WardrobeSearch,
} from "@/lib/wardrobe-search";

const facetOf: Record<FilterKey, keyof ItemFacets> = {
  category: "categories",
  color: "colors",
  brand: "brands",
  season: "seasons",
};

type FiltersProps = {
  search: WardrobeSearch;
  facets: ItemFacets | undefined;
  onChange: (search: WardrobeSearch) => void;
};

function FilterSelect({ filter, search, facets, onChange }: FiltersProps & { filter: FilterKey }) {
  const id = useId();
  const value = search[filter] ?? "";
  const options: string[] = [...(facets?.[facetOf[filter]] ?? [])];
  // A value from the URL stays selectable even if no item has it any more.
  if (value !== "" && !options.includes(value)) options.unshift(value);

  return (
    <div className="wardrobe-filter">
      <label htmlFor={id} className="wardrobe-field-label">
        {filterLabels[filter].label}
      </label>
      <select
        id={id}
        className="wardrobe-input wardrobe-select"
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value === ""
              ? withoutFilter(search, filter)
              : { ...search, [filter]: event.target.value },
          )
        }
      >
        <option value="">{filterLabels[filter].all}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {filterValueLabel(filter, option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function FilterSelects(props: FiltersProps) {
  return (
    <>
      {FILTER_KEYS.map((filter) => (
        <FilterSelect key={filter} filter={filter} {...props} />
      ))}
    </>
  );
}

// Dropdowns in a row on larger screens, a bottom sheet on phones, and the
// active filters as removable chips.
export function WardrobeFilters(props: FiltersProps) {
  const { search, onChange } = props;
  const [sheetOpen, setSheetOpen] = useState(false);
  const active = activeFilters(search);
  const hasSearchOrFilter = active.length > 0 || search.q !== undefined;

  return (
    <div className="wardrobe-filters">
      <div className="wardrobe-filters-desktop">
        <FilterSelects {...props} />
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button type="button" variant="outline" className="wardrobe-filter-button h-11 px-4">
            <SlidersHorizontal aria-hidden="true" />
            Filter
            {active.length > 0 && (
              <span className="wardrobe-filter-count">
                {active.length}
                <span className="sr-only"> aktiv</span>
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="wardrobe-sheet">
          <SheetHeader>
            <SheetTitle className="wardrobe-sheet-title">Filter</SheetTitle>
            <SheetDescription>Änderungen werden sofort angewendet.</SheetDescription>
          </SheetHeader>
          <div className="wardrobe-sheet-fields">
            <FilterSelects {...props} />
          </div>
          <Button
            type="button"
            className="h-12 w-full text-base"
            onClick={() => setSheetOpen(false)}
          >
            Fertig
          </Button>
        </SheetContent>
      </Sheet>

      {hasSearchOrFilter && (
        <ul className="wardrobe-chips" aria-label="Aktive Filter">
          {search.q !== undefined && (
            <li>
              <button
                type="button"
                className="wardrobe-chip"
                onClick={() => {
                  const next = { ...search };
                  delete next.q;
                  onChange(next);
                }}
              >
                Suche: {search.q}
                <X aria-hidden="true" />
                <span className="sr-only"> entfernen</span>
              </button>
            </li>
          )}
          {active.map((filter) => (
            <li key={filter.key}>
              <button
                type="button"
                className="wardrobe-chip"
                onClick={() => onChange(withoutFilter(search, filter.key))}
              >
                {filter.label}
                <X aria-hidden="true" />
                <span className="sr-only"> entfernen</span>
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              className="wardrobe-reset"
              onClick={() => onChange(withoutAllFilters(search))}
            >
              Alle zurücksetzen
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
