import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import type { ItemResponse } from "@shared/item";

import { Button } from "@/components/ui/button";
import { WARDROBE_PATH } from "@/config/wardrobe";
import { itemPhotoUrl } from "@/lib/items-api";

type ItemSavedProps = {
  item: ItemResponse;
  onNext: () => void;
};

export function ItemSaved({ item, onNext }: ItemSavedProps) {
  const heading = useRef<HTMLHeadingElement>(null);

  // The form this replaces had the focus; keep keyboard and screen reader users here.
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="item-saved" aria-labelledby="item-saved-heading">
      {item.thumbnailKey !== null && (
        <img
          className="item-saved-photo"
          src={itemPhotoUrl(item.thumbnailKey)}
          alt={`Foto: ${item.name}`}
        />
      )}
      <h2 id="item-saved-heading" ref={heading} tabIndex={-1} className="item-saved-title">
        {item.name} ist in deinem Schrank.
      </h2>
      <div className="item-saved-actions">
        <Button type="button" className="h-12 flex-1 text-base" onClick={onNext}>
          Nächstes Teil
        </Button>
        <Button asChild variant="outline" className="h-12 flex-1 text-base">
          <Link to={WARDROBE_PATH}>Zum Schrank</Link>
        </Button>
      </div>
    </section>
  );
}
