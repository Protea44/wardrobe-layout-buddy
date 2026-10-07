import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Check, Search } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { SEARCH_DEBOUNCE_MS } from "@/config/wardrobe";
import { ApiError } from "@/lib/api";
import { fetchItemFacets, fetchItems, itemPhotoUrl, itemQueryKeys } from "@/lib/items-api";
import type { PickedItem } from "@/lib/outfit-canvas";
import type { WardrobeSearch } from "@/lib/wardrobe-search";

type ItemPickerProps = {
  // Items already on the canvas.
  pickedIds: ReadonlySet<string>;
  onPick: (item: PickedItem) => void;
};

// The user's wardrobe with search and category filter; a tap adds an item.
export function ItemPicker({ pickedIds, onPick }: ItemPickerProps) {
  const id = useId();
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  const search: WardrobeSearch = {
    ...(query !== "" && { q: query }),
    ...(category !== "" && { category }),
  };
  const list = useInfiniteQuery({
    queryKey: itemQueryKeys.list(search),
    queryFn: ({ pageParam }) => fetchItems(search, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    placeholderData: keepPreviousData,
  });
  const facets = useQuery({ queryKey: itemQueryKeys.facets, queryFn: fetchItemFacets });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="item-picker">
      <div className="wardrobe-search">
        <label htmlFor={`${id}-search`} className="sr-only">
          Teile durchsuchen
        </label>
        <Search aria-hidden="true" className="wardrobe-search-icon" />
        <input
          id={`${id}-search`}
          type="search"
          className="wardrobe-input wardrobe-search-input"
          placeholder="Teile durchsuchen …"
          value={text}
          maxLength={100}
          autoComplete="off"
          onChange={(event) => setText(event.target.value)}
        />
      </div>
      <div className="wardrobe-filter">
        <label htmlFor={`${id}-category`} className="wardrobe-field-label">
          Kategorie
        </label>
        <select
          id={`${id}-category`}
          className="wardrobe-input wardrobe-select"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">Alle Kategorien</option>
          {facets.data?.categories.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {list.isPending && <p className="receipt-muted">Teile werden geladen …</p>}
      {list.isError && (
        <p className="form-error" role="alert">
          {list.error instanceof ApiError
            ? list.error.message
            : "Deine Teile konnten nicht geladen werden."}
        </p>
      )}
      {list.data && items.length === 0 && (
        <p className="receipt-muted">
          {query || category ? "Keine Teile gefunden." : "Dein Schrank ist noch leer."}
        </p>
      )}

      <ul className="item-picker-grid">
        {items.map((item) => {
          const picked = pickedIds.has(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                className="item-picker-item"
                disabled={picked}
                onClick={() =>
                  onPick({ itemId: item.id, name: item.name, thumbnailKey: item.thumbnailKey })
                }
              >
                <span className="item-picker-photo">
                  {item.thumbnailKey !== null && (
                    <img src={itemPhotoUrl(item.thumbnailKey)} alt="" loading="lazy" />
                  )}
                  {picked && (
                    <span className="item-picker-check">
                      <Check aria-hidden="true" />
                    </span>
                  )}
                </span>
                <span className="item-picker-name">
                  {item.name}
                  {picked && <span className="sr-only">, bereits im Outfit</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {list.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={list.isFetchingNextPage}
          onClick={() => void list.fetchNextPage()}
        >
          {list.isFetchingNextPage ? "Wird geladen …" : "Mehr laden"}
        </Button>
      )}
    </div>
  );
}
