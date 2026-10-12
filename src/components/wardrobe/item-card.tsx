import { Link } from "@tanstack/react-router";
import { Lock, Shirt } from "lucide-react";

import type { ItemResponse } from "@shared/item";

import { StoredImage } from "@/components/stored-image";
import type { WardrobeSearch } from "@/lib/wardrobe-search";

// `search` holds the wardrobe's filters; the item page links back with them.
export function ItemCard({ item, search }: { item: ItemResponse; search: WardrobeSearch }) {
  return (
    <li>
      <Link to="/profil/schrank/$id" params={{ id: item.id }} search={search} className="item-card">
        <div className="item-card-photo">
          {item.thumbnailKey !== null ? (
            // The name below already describes the photo.
            <StoredImage storageKey={item.thumbnailKey} alt="" loading="lazy" decoding="async" />
          ) : (
            <Shirt aria-hidden="true" className="item-card-placeholder" />
          )}
        </div>
        <div className="item-card-text">
          {item.brand !== null && <p className="item-card-brand">{item.brand}</p>}
          <p className="item-card-name">
            {item.name}
            {item.visibility === "PRIVATE" && (
              <>
                <Lock aria-hidden="true" className="item-card-lock" />
                <span className="sr-only">, privat</span>
              </>
            )}
          </p>
        </div>
      </Link>
    </li>
  );
}
