import { Link } from "@tanstack/react-router";
import { Lock, Shirt } from "lucide-react";

import type { ItemResponse } from "@shared/item";

import { itemPhotoUrl } from "@/lib/items-api";

export function ItemCard({ item }: { item: ItemResponse }) {
  return (
    <li>
      <Link to="/profil/schrank/$id" params={{ id: item.id }} className="item-card">
        <div className="item-card-photo">
          {item.thumbnailKey !== null ? (
            // The name below already describes the photo.
            <img src={itemPhotoUrl(item.thumbnailKey)} alt="" loading="lazy" decoding="async" />
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
