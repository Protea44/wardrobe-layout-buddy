import type { ItemListResponse, ItemResponse } from "@shared/item";
import type { OutfitResponse } from "@shared/outfit";

import { ApiError } from "@/lib/api";
import { fetchItem, fetchItemFacets, fetchItems } from "@/lib/items-api";
import { db, isLocalKey } from "@/lib/offline/db";
import { cacheImage } from "@/lib/offline/images";
import { facetsOf, queryItems } from "@/lib/offline/local-query";
import { isNetworkError, isOnline } from "@/lib/offline/online";
import { fetchOutfit, fetchOutfits } from "@/lib/outfits-api";
import type { WardrobeSearch } from "@/lib/wardrobe-search";

const NOT_CACHED = "Das ist offline nicht gespeichert. Bitte verbinde dich mit dem Internet.";

// Online: the API, and the offline cache gets refreshed in the background.
// Offline or without an answer: the offline cache.
async function withFallback<T>(remote: () => Promise<T>, local: () => Promise<T>): Promise<T> {
  if (!isOnline()) return local();
  try {
    const result = await remote();
    scheduleCacheRefresh();
    return result;
  } catch (error) {
    if (isNetworkError(error)) return local();
    throw error;
  }
}

export function loadItems(
  search: WardrobeSearch,
  cursor: string | null,
): Promise<ItemListResponse> {
  return withFallback(
    () => fetchItems(search, cursor),
    async () =>
      // Everything comes on the first page; a cursor from an online page ends the list.
      cursor === null
        ? queryItems(await db.items.toArray(), search)
        : { items: [], total: 0, nextCursor: null },
  );
}

export function loadItemFacets() {
  return withFallback(fetchItemFacets, async () => facetsOf(await db.items.toArray()));
}

async function cached<T>(record: T | undefined): Promise<T> {
  if (record === undefined) throw new ApiError(NOT_CACHED, null);
  return record;
}

export function loadItem(id: string): Promise<ItemResponse> {
  return withFallback(
    async () => {
      const item = await fetchItem(id);
      await db.items.put(item);
      return item;
    },
    async () => cached(await db.items.get(id)),
  );
}

export function loadOutfits(): Promise<OutfitResponse[]> {
  return withFallback(fetchOutfits, async () =>
    (await db.outfits.toArray()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export function loadOutfit(id: string): Promise<OutfitResponse> {
  return withFallback(
    () => fetchOutfit(id),
    async () => cached(await db.outfits.get(id)),
  );
}

// At most one snapshot per minute, a few seconds after the last load.
const REFRESH_INTERVAL_MS = 60_000;
let lastRefresh = 0;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleCacheRefresh() {
  if (refreshTimer !== null || Date.now() - lastRefresh < REFRESH_INTERVAL_MS) return;
  refreshTimer = setTimeout(() => {
    refreshTimer = null;
    void refreshOfflineCache().catch(() => {
      // Offline or the server failed; the next successful load tries again.
    });
  }, 2_000);
}

async function fetchAllItems() {
  const items: ItemResponse[] = [];
  let cursor: string | null = null;
  do {
    const page: ItemListResponse = await fetchItems({}, cursor);
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return items;
}

// Replaces the offline copy with the server's state: all active items, all
// outfits and their thumbnails. Skipped while offline changes wait to be
// synced, so they are never overwritten.
export async function refreshOfflineCache() {
  if (!isOnline() || (await db.meta.get("owner")) === undefined) return;
  if ((await db.outbox.count()) > 0) return;
  lastRefresh = Date.now();

  const [items, outfits] = await Promise.all([fetchAllItems(), fetchOutfits()]);
  if ((await db.outbox.count()) > 0) return;

  await db.transaction("rw", db.items, db.outfits, async () => {
    await db.items.clear();
    await db.items.bulkPut(items);
    await db.outfits.clear();
    await db.outfits.bulkPut(outfits);
  });

  const wanted = new Set(
    [
      ...items.map((item) => item.thumbnailKey),
      ...outfits.flatMap((outfit) => outfit.items.map((item) => item.thumbnailKey)),
    ].filter((key): key is string => key !== null),
  );
  for (const key of wanted) await cacheImage(key);
  const stale = (await db.images.toCollection().primaryKeys()).filter(
    (key) => !wanted.has(key) && !isLocalKey(key),
  );
  await db.images.bulkDelete(stale);
}
