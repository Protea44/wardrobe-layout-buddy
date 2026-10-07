import { toast } from "sonner";

import type { ItemEditInput, ItemUploadInput } from "@shared/item";

import { ApiError } from "@/lib/api";
import { fetchItem, replaceItemPhoto, updateItem, uploadItem } from "@/lib/items-api";
import { db, localPhotoKey, type OutboxEntry } from "@/lib/offline/db";
import { refreshOfflineCache } from "@/lib/offline/data";
import { isNetworkError, isOnline } from "@/lib/offline/online";
import { fetchOutfit, saveOutfit } from "@/lib/outfits-api";

type Entry = OutboxEntry & { seq: number };
type EntryOf<T extends OutboxEntry["type"]> = Extract<OutboxEntry, { type: T }>;

async function pending<T extends OutboxEntry["type"]>(
  type: T,
  matches: (entry: EntryOf<T>) => boolean,
) {
  const entries = (await db.outbox.toArray()) as Entry[];
  return entries.find(
    (entry): entry is Entry & EntryOf<T> => entry.type === type && matches(entry as EntryOf<T>),
  );
}

// Fields of an edit, applied to a create that has not been synced yet. A
// create has nothing to clear, so null simply stays null.
function mergeIntoCreate(fields: ItemUploadInput, edit: ItemEditInput): ItemUploadInput {
  return {
    ...fields,
    ...edit,
    name: edit.name ?? fields.name,
    category: edit.category ?? fields.category,
  } as ItemUploadInput;
}

// Adds a change to the queue. Changes to a record that already waits in the
// queue are merged into that entry, which keeps the order and the server
// version the first offline change started from.
export async function enqueue(entry: OutboxEntry) {
  await db.transaction("rw", db.outbox, async () => {
    if (entry.type === "updateItem") {
      const create = await pending("createItem", (other) => other.itemId === entry.itemId);
      if (create) {
        await db.outbox.put({ ...create, fields: mergeIntoCreate(create.fields, entry.fields) });
        return;
      }
      const update = await pending("updateItem", (other) => other.itemId === entry.itemId);
      if (update) {
        await db.outbox.put({ ...update, fields: { ...update.fields, ...entry.fields } });
        return;
      }
    }
    if (entry.type === "replacePhoto") {
      const create = await pending("createItem", (other) => other.itemId === entry.itemId);
      if (create) {
        await db.outbox.put({ ...create, photo: entry.photo, thumbnail: entry.thumbnail });
        return;
      }
      const replace = await pending("replacePhoto", (other) => other.itemId === entry.itemId);
      if (replace) {
        await db.outbox.put({ ...replace, photo: entry.photo, thumbnail: entry.thumbnail });
        return;
      }
    }
    if (entry.type === "updateOutfit" || entry.type === "createOutfit") {
      const earlier =
        (await pending("createOutfit", (other) => other.outfitId === entry.outfitId)) ??
        (await pending("updateOutfit", (other) => other.outfitId === entry.outfitId));
      if (earlier) {
        await db.outbox.put({ ...earlier, input: entry.input });
        return;
      }
    }
    await db.outbox.add(entry);
  });
}

export async function pendingCount() {
  return db.outbox.count();
}

// True while the queue still holds a change of this item or outfit.
export async function hasPendingChanges(recordId: string) {
  const entries = await db.outbox.toArray();
  return entries.some((entry) => ("itemId" in entry ? entry.itemId : entry.outfitId) === recordId);
}

// The newer server version is overwritten (last write wins), but the user hears about it.
function warnIfOverwritten(serverUpdatedAt: string, baseUpdatedAt: string, name: string) {
  if (Date.parse(serverUpdatedAt) > Date.parse(baseUpdatedAt)) {
    toast.warning(
      `„${name}“ wurde inzwischen auf einem anderen Gerät geändert. Deine Offline-Änderung hat diese Version überschrieben.`,
    );
  }
}

async function apply(entry: Entry) {
  switch (entry.type) {
    case "createItem": {
      const item = await uploadItem({
        photo: entry.photo,
        thumbnail: entry.thumbnail,
        fields: { ...entry.fields, id: entry.itemId },
      });
      await db.transaction("rw", db.items, db.images, async () => {
        await db.items.put(item);
        await db.images.bulkDelete([
          localPhotoKey(entry.itemId, "photo"),
          localPhotoKey(entry.itemId, "thumbnail"),
        ]);
        if (item.thumbnailKey !== null) {
          await db.images.put({ key: item.thumbnailKey, blob: entry.thumbnail });
        }
      });
      return;
    }
    case "updateItem": {
      const current = await fetchItem(entry.itemId);
      const item = await updateItem(entry.itemId, entry.fields);
      warnIfOverwritten(current.updatedAt, entry.baseUpdatedAt, item.name);
      await db.items.put(item);
      return;
    }
    case "replacePhoto": {
      const item = await replaceItemPhoto(entry.itemId, {
        photo: entry.photo,
        thumbnail: entry.thumbnail,
      });
      await db.transaction("rw", db.items, db.images, async () => {
        await db.items.put(item);
        await db.images.bulkDelete([
          localPhotoKey(entry.itemId, "photo"),
          localPhotoKey(entry.itemId, "thumbnail"),
        ]);
        if (item.thumbnailKey !== null) {
          await db.images.put({ key: item.thumbnailKey, blob: entry.thumbnail });
        }
      });
      return;
    }
    case "createOutfit": {
      await db.outfits.put(await saveOutfit(null, entry.input, entry.outfitId));
      return;
    }
    case "updateOutfit": {
      const current = await fetchOutfit(entry.outfitId);
      const outfit = await saveOutfit(entry.outfitId, entry.input);
      warnIfOverwritten(current.updatedAt, entry.baseUpdatedAt, outfit.name);
      await db.outfits.put(outfit);
      return;
    }
  }
}

// Worth another try later: no connection, an expired session, rate limits
// and server errors.
function isTemporary(error: unknown) {
  if (isNetworkError(error)) return true;
  if (!(error instanceof ApiError)) return false;
  const status = error.status ?? 0;
  return status === 401 || status === 408 || status === 429 || status >= 500;
}

function dropMessage(entry: Entry, error: unknown) {
  const deleted = error instanceof ApiError && error.status === 404;
  const what = entry.type.endsWith("Outfit") ? "Ein Outfit" : "Ein Teil";
  return deleted
    ? `${what} wurde inzwischen gelöscht. Deine Offline-Änderung daran wurde verworfen.`
    : `${what} konnte nicht synchronisiert werden und wurde verworfen.`;
}

const listeners = new Set<() => void>();

// Called after every sync that changed something, e.g. to reload queries.
export function onSynced(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

let running: Promise<void> | null = null;

// Sends the queue to the API in order, one entry at a time. Stops at the first
// temporary failure and keeps the rest for the next attempt. Only one run at a
// time; client ids make a repeated create harmless anyway.
export function syncOutbox(): Promise<void> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}

async function run() {
  let changed = false;
  while (isOnline()) {
    const entry = (await db.outbox.orderBy("seq").first()) as Entry | undefined;
    if (!entry) break;
    try {
      await apply(entry);
    } catch (error) {
      if (isTemporary(error)) break;
      toast.error(dropMessage(entry, error));
    }
    await db.outbox.delete(entry.seq);
    changed = true;
  }
  if (!changed) return;
  listeners.forEach((listener) => listener());
  if ((await db.outbox.count()) === 0) await refreshOfflineCache().catch(() => {});
}
