import type { ItemEditInput, ItemResponse, ItemUploadInput } from "@shared/item";
import type { OutfitResponse, OutfitSaveInput } from "@shared/outfit";

import { replaceItemPhoto, updateItem, uploadItem } from "@/lib/items-api";
import { db, localPhotoKey } from "@/lib/offline/db";
import { isNetworkError, isOnline } from "@/lib/offline/online";
import { enqueue, hasPendingChanges, syncOutbox } from "@/lib/offline/outbox";
import type { CanvasItem } from "@/lib/outfit-canvas";
import { saveOutfit } from "@/lib/outfits-api";
import type { UploadOptions } from "@/lib/upload";

type Photo = { photo: Blob; thumbnail: Blob };

// Runs the request online; without a connection (or an answer) it returns
// null so the caller saves the change offline instead. A record with changes
// still in the queue is queued as well, behind them, so the order holds.
async function tryOnline<T>(recordId: string, request: () => Promise<T>): Promise<T | null> {
  if (!isOnline()) return null;
  if (await hasPendingChanges(recordId)) {
    void syncOutbox();
    return null;
  }
  try {
    return await request();
  } catch (error) {
    if (isNetworkError(error)) return null;
    throw error;
  }
}

export function newClientId() {
  return crypto.randomUUID();
}

function localItem(id: string, fields: ItemUploadInput, now: string): ItemResponse {
  return {
    id,
    name: fields.name,
    category: fields.category,
    color: fields.color ?? null,
    brand: fields.brand ?? null,
    size: fields.size ?? null,
    price: fields.price ?? null,
    currency: fields.currency ?? "EUR",
    purchaseDate: fields.purchaseDate ?? null,
    material: fields.material ?? null,
    retailer: fields.retailer ?? null,
    productUrl: fields.productUrl ?? null,
    seasons: fields.seasons ?? [],
    notes: fields.notes ?? null,
    photoKey: localPhotoKey(id, "photo"),
    thumbnailKey: localPhotoKey(id, "thumbnail"),
    receiptId: fields.receiptId ?? null,
    visibility: "PRIVATE",
    isForSale: false,
    isTradeable: false,
    isLinkable: false,
    lifecycleStatus: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };
}

async function storeLocalPhoto(itemId: string, photo: Photo) {
  await db.images.bulkPut([
    { key: localPhotoKey(itemId, "photo"), blob: photo.photo },
    { key: localPhotoKey(itemId, "thumbnail"), blob: photo.thumbnail },
  ]);
}

// A new item, online right away or offline into the queue. The client id
// makes every retry return the same item.
export async function createItem(
  input: Photo & { fields: ItemUploadInput },
  options: UploadOptions = {},
): Promise<ItemResponse> {
  const id = input.fields.id ?? newClientId();
  const fields = { ...input.fields, id };

  const item = await tryOnline(id, () => uploadItem({ ...input, fields }, options));
  if (item !== null) {
    await db.items.put(item);
    if (item.thumbnailKey !== null) {
      await db.images.put({ key: item.thumbnailKey, blob: input.thumbnail });
    }
    return item;
  }

  const local = localItem(id, fields, new Date().toISOString());
  await db.transaction("rw", db.items, db.images, db.outbox, async () => {
    await storeLocalPhoto(id, input);
    await db.items.put(local);
    await enqueue({
      type: "createItem",
      itemId: id,
      fields,
      photo: input.photo,
      thumbnail: input.thumbnail,
    });
  });
  syncSoon();
  return local;
}

// Changes of the edit form, and optionally a new photo.
export async function editItem(
  item: ItemResponse,
  fields: ItemEditInput,
  photo: Photo | null,
  options: UploadOptions = {},
): Promise<ItemResponse> {
  const online = await tryOnline(item.id, async () => {
    let updated = await updateItem(item.id, fields);
    if (photo !== null) updated = await replaceItemPhoto(item.id, photo, options);
    return updated;
  });
  if (online !== null) {
    await db.items.put(online);
    if (photo !== null && online.thumbnailKey !== null) {
      await db.images.put({ key: online.thumbnailKey, blob: photo.thumbnail });
    }
    return online;
  }

  const local: ItemResponse = {
    ...item,
    ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
    ...(photo !== null && {
      photoKey: localPhotoKey(item.id, "photo"),
      thumbnailKey: localPhotoKey(item.id, "thumbnail"),
    }),
    updatedAt: new Date().toISOString(),
  };
  await db.transaction("rw", db.items, db.images, db.outbox, async () => {
    await db.items.put(local);
    await enqueue({ type: "updateItem", itemId: item.id, fields, baseUpdatedAt: item.updatedAt });
    if (photo !== null) {
      await storeLocalPhoto(item.id, photo);
      await enqueue({ type: "replacePhoto", itemId: item.id, ...photo });
    }
  });
  syncSoon();
  return local;
}

// Creates (existing null) or replaces an outfit. Canvas items supply the
// names and thumbnails the offline copy needs.
export async function storeOutfit(
  outfitId: string,
  existing: OutfitResponse | null,
  input: OutfitSaveInput,
  canvas: CanvasItem[],
): Promise<OutfitResponse> {
  const online = await tryOnline(outfitId, () =>
    existing === null ? saveOutfit(null, input, outfitId) : saveOutfit(outfitId, input),
  );
  if (online !== null) {
    await db.outfits.put(online);
    return online;
  }

  const now = new Date().toISOString();
  const local: OutfitResponse = {
    id: outfitId,
    name: input.name,
    occasion: input.occasion ?? null,
    items: input.items.map((placement, index) => ({
      ...placement,
      name: canvas[index]?.name ?? "",
      thumbnailKey: canvas[index]?.thumbnailKey ?? null,
    })),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.transaction("rw", db.outfits, db.outbox, async () => {
    await db.outfits.put(local);
    await enqueue(
      existing === null
        ? { type: "createOutfit", outfitId, input }
        : { type: "updateOutfit", outfitId, input, baseUpdatedAt: existing.updatedAt },
    );
  });
  syncSoon();
  return local;
}

// Starts syncing right away when a change could not be sent only because of
// a short connection drop.
export function syncSoon() {
  if (isOnline()) void syncOutbox();
}
