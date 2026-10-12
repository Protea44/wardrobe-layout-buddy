import Dexie, { type EntityTable, type Table } from "dexie";

import type { ItemEditInput, ItemResponse, ItemUploadInput } from "@shared/item";
import type { OutfitResponse, OutfitSaveInput } from "@shared/outfit";

// A thumbnail (or a photo made offline) as a blob. Keys are storage keys, or
// "local:{itemId}:photo|thumbnail" for photos not uploaded yet.
export type CachedImage = { key: string; blob: Blob };

// Changes made offline, synced to the API in order (seq).
export type OutboxEntry = { seq?: number } & (
  | { type: "createItem"; itemId: string; fields: ItemUploadInput; photo: Blob; thumbnail: Blob }
  | {
      type: "updateItem";
      itemId: string;
      fields: ItemEditInput;
      // updatedAt of the server version the edit started from.
      baseUpdatedAt: string;
    }
  | { type: "replacePhoto"; itemId: string; photo: Blob; thumbnail: Blob }
  | { type: "createOutfit"; outfitId: string; input: OutfitSaveInput }
  | { type: "updateOutfit"; outfitId: string; input: OutfitSaveInput; baseUpdatedAt: string }
);

type Meta = { key: "owner"; value: string };

// The logged-in user's wardrobe for offline use. Outfit placements live inside
// each outfit record, as the API returns them. Cleared on logout.
class OfflineDatabase extends Dexie {
  items!: EntityTable<ItemResponse, "id">;
  outfits!: EntityTable<OutfitResponse, "id">;
  images!: EntityTable<CachedImage, "key">;
  // A plain Table: EntityTable's Omit would collapse the union of entry kinds.
  outbox!: Table<OutboxEntry, number>;
  meta!: EntityTable<Meta, "key">;

  constructor() {
    super("kleiderschrank-kompakt");
    this.version(1).stores({
      items: "id",
      outfits: "id",
      images: "key",
      outbox: "++seq",
      meta: "key",
    });
  }
}

export const db = new OfflineDatabase();

export const localPhotoKey = (itemId: string, kind: "photo" | "thumbnail") =>
  `local:${itemId}:${kind}`;

export const isLocalKey = (key: string) => key.startsWith("local:");
