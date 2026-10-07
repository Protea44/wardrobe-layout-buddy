import type { OutfitResponse } from "@shared/outfit";

import { OutfitItemImage } from "@/components/outfits/outfit-item-image";
import { fromOutfit, placementStyle } from "@/lib/outfit-canvas";

// A small, static picture of an outfit with its items at their saved places.
export function OutfitPreview({ outfit }: { outfit: OutfitResponse }) {
  return (
    <div className="outfit-canvas outfit-canvas--preview" aria-hidden="true">
      {fromOutfit(outfit).map((item, index) => (
        <div key={item.itemId} className="outfit-canvas-item" style={placementStyle(item, index)}>
          <OutfitItemImage name={item.name} thumbnailKey={item.thumbnailKey} />
        </div>
      ))}
    </div>
  );
}
