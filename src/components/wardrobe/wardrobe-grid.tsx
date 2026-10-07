import { useEffect, useRef } from "react";

import type { ItemResponse } from "@shared/item";

import { ItemCard } from "@/components/wardrobe/item-card";
import { Button } from "@/components/ui/button";
import type { WardrobeSearch } from "@/lib/wardrobe-search";

type WardrobeGridProps = {
  items: ItemResponse[];
  search: WardrobeSearch;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
};

// Loads the next page once the end of the grid comes near. The button stays as
// a fallback for keyboards, screen readers and browsers without observers.
export function WardrobeGrid({
  items,
  search,
  hasMore,
  loadingMore,
  onLoadMore,
}: WardrobeGridProps) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || target === null || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <>
      <ul className="wardrobe-grid">
        {items.map((item) => (
          <ItemCard key={item.id} item={item} search={search} />
        ))}
      </ul>
      {hasMore && (
        <div ref={sentinel} className="wardrobe-more">
          <Button
            type="button"
            variant="outline"
            className="h-12 px-8 text-base"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Wird geladen …" : "Mehr laden"}
          </Button>
        </div>
      )}
    </>
  );
}
