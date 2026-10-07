import { itemPhotoUrl } from "@/lib/items-api";

// The thumbnail, or the name when the item has no photo.
export function OutfitItemImage({
  name,
  thumbnailKey,
}: {
  name: string;
  thumbnailKey: string | null;
}) {
  return thumbnailKey !== null ? (
    <img src={itemPhotoUrl(thumbnailKey)} alt="" draggable={false} loading="lazy" />
  ) : (
    <span className="outfit-item-fallback">{name}</span>
  );
}
