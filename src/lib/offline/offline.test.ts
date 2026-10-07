import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ItemResponse } from "@shared/item";

import { ApiError } from "@/lib/api";
import * as itemsApi from "@/lib/items-api";
import { db, localPhotoKey } from "@/lib/offline/db";
import { loadItems } from "@/lib/offline/data";
import { createItem, editItem, storeOutfit } from "@/lib/offline/mutations";
import { enqueue, syncOutbox } from "@/lib/offline/outbox";
import { clearOfflineData, requireSession } from "@/lib/offline/session";
import * as outfitsApi from "@/lib/outfits-api";
import { itemFixture } from "@/test/fixtures";

const toast = vi.hoisted(() => ({ warning: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const session = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn() }));
vi.mock("@/lib/auth-client", () => ({ authClient: session }));

const photo = () => ({ photo: new Blob(["photo"]), thumbnail: new Blob(["thumb"]) });
const offlineError = () => new ApiError("Keine Verbindung", null);

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });
}

beforeEach(async () => {
  await clearOfflineData();
  await db.meta.put({ key: "owner", value: "user-1" });
  setOnline(true);
  vi.clearAllMocks();
});
afterEach(() => vi.restoreAllMocks());

describe("offline edits", () => {
  it("saves a new item locally with its photo and queues it when offline", async () => {
    setOnline(false);
    const upload = vi.spyOn(itemsApi, "uploadItem");

    const item = await createItem({
      ...photo(),
      fields: { name: "Hemd", category: "Oberteil" },
    });

    expect(upload).not.toHaveBeenCalled();
    expect(item.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(item.thumbnailKey).toBe(localPhotoKey(item.id, "thumbnail"));
    expect(await db.items.get(item.id)).toEqual(item);
    expect(await db.images.get(localPhotoKey(item.id, "photo"))).toBeDefined();
    expect(await db.outbox.toArray()).toMatchObject([
      { type: "createItem", itemId: item.id, fields: { id: item.id, name: "Hemd" } },
    ]);
  });

  it("falls back to the queue when the connection drops during the request", async () => {
    vi.spyOn(itemsApi, "uploadItem").mockRejectedValue(offlineError());

    const item = await createItem({ ...photo(), fields: { name: "Hemd", category: "Oberteil" } });

    expect(await db.outbox.count()).toBe(1);
    expect(await db.items.get(item.id)).toBeDefined();
  });

  it("merges edits of a queued item into the queued create", async () => {
    setOnline(false);
    const item = await createItem({ ...photo(), fields: { name: "Hemd", category: "Oberteil" } });

    await editItem(item, { name: "Leinenhemd", brand: "Marke" }, photo());

    const queue = await db.outbox.toArray();
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({
      type: "createItem",
      fields: { name: "Leinenhemd", brand: "Marke", category: "Oberteil" },
    });
    expect((await db.items.get(item.id))?.name).toBe("Leinenhemd");
  });

  it("keeps the first server version when an item is edited offline twice", async () => {
    setOnline(false);
    const item = itemFixture({ updatedAt: "2026-10-01T10:00:00.000Z" });
    await db.items.put(item);

    const first = await editItem(item, { name: "Erste" }, null);
    await editItem(first, { brand: "Zweite" }, null);

    expect(await db.outbox.toArray()).toMatchObject([
      {
        type: "updateItem",
        fields: { name: "Erste", brand: "Zweite" },
        baseUpdatedAt: "2026-10-01T10:00:00.000Z",
      },
    ]);
  });
});

describe("syncing the queue", () => {
  const serverItem = (overrides: Partial<ItemResponse> = {}) =>
    itemFixture({ thumbnailKey: "user-1/x/thumbnail-1.webp", ...overrides });

  it("sends the queue in order and replaces the local copies", async () => {
    setOnline(false);
    const created = await createItem({
      ...photo(),
      fields: { name: "Hemd", category: "Oberteil" },
    });
    await storeOutfit(
      "4c7b2b3e-6f2d-4a51-9b0e-1d2c3b4a5f60",
      null,
      {
        name: "Büro",
        occasion: null,
        items: [{ itemId: created.id, x: 0.5, y: 0.5, scale: 1, zIndex: 0 }],
      },
      [
        {
          itemId: created.id,
          x: 0.5,
          y: 0.5,
          scale: 1,
          name: "Hemd",
          thumbnailKey: created.thumbnailKey,
        },
      ],
    );
    setOnline(true);

    const calls: string[] = [];
    vi.spyOn(itemsApi, "uploadItem").mockImplementation(async ({ fields }) => {
      calls.push(`item:${fields.id}`);
      return serverItem({ id: created.id, name: "Hemd" });
    });
    vi.spyOn(outfitsApi, "saveOutfit").mockImplementation(async (id, input, clientId) => {
      calls.push(`outfit:${id}:${clientId}`);
      return {
        id: clientId ?? "",
        name: input.name,
        occasion: null,
        items: [],
        createdAt: "2026-10-07T12:00:00.000Z",
        updatedAt: "2026-10-07T12:00:00.000Z",
      };
    });
    vi.spyOn(itemsApi, "fetchItems").mockResolvedValue({ items: [], total: 0, nextCursor: null });
    vi.spyOn(outfitsApi, "fetchOutfits").mockResolvedValue([]);

    await syncOutbox();

    expect(calls).toEqual([
      `item:${created.id}`,
      "outfit:null:4c7b2b3e-6f2d-4a51-9b0e-1d2c3b4a5f60",
    ]);
    expect(await db.outbox.count()).toBe(0);
    expect(await db.images.get(localPhotoKey(created.id, "thumbnail"))).toBeUndefined();
  });

  it("stops at a lost connection and keeps the rest for later", async () => {
    await enqueue({
      type: "updateItem",
      itemId: "a",
      fields: { name: "A" },
      baseUpdatedAt: "2026-10-01T00:00:00.000Z",
    });
    await enqueue({
      type: "updateItem",
      itemId: "b",
      fields: { name: "B" },
      baseUpdatedAt: "2026-10-01T00:00:00.000Z",
    });
    vi.spyOn(itemsApi, "fetchItem").mockRejectedValue(offlineError());

    await syncOutbox();

    expect((await db.outbox.toArray()).map((entry) => "itemId" in entry && entry.itemId)).toEqual([
      "a",
      "b",
    ]);
  });

  it("overwrites a newer server version and says so", async () => {
    await enqueue({
      type: "updateItem",
      itemId: "a",
      fields: { name: "Offline" },
      baseUpdatedAt: "2026-10-01T00:00:00.000Z",
    });
    vi.spyOn(itemsApi, "fetchItem").mockResolvedValue(
      serverItem({ id: "a", updatedAt: "2026-10-02T00:00:00.000Z" }),
    );
    const update = vi
      .spyOn(itemsApi, "updateItem")
      .mockResolvedValue(serverItem({ id: "a", name: "Offline" }));

    await syncOutbox();

    expect(update).toHaveBeenCalledWith("a", { name: "Offline" });
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining("überschrieben"));
    expect((await db.items.get("a"))?.name).toBe("Offline");
  });

  it("does not warn when the server version is the one the edit started from", async () => {
    await enqueue({
      type: "updateItem",
      itemId: "a",
      fields: { name: "Offline" },
      baseUpdatedAt: "2026-10-01T00:00:00.000Z",
    });
    vi.spyOn(itemsApi, "fetchItem").mockResolvedValue(
      serverItem({ id: "a", updatedAt: "2026-10-01T00:00:00.000Z" }),
    );
    vi.spyOn(itemsApi, "updateItem").mockResolvedValue(serverItem({ id: "a" }));

    await syncOutbox();

    expect(toast.warning).not.toHaveBeenCalled();
  });

  it("drops a change to an item deleted in the meantime and tells the user", async () => {
    await enqueue({
      type: "updateItem",
      itemId: "a",
      fields: { name: "X" },
      baseUpdatedAt: "2026-10-01T00:00:00.000Z",
    });
    vi.spyOn(itemsApi, "fetchItem").mockRejectedValue(new ApiError("Nicht gefunden", 404));

    await syncOutbox();

    expect(await db.outbox.count()).toBe(0);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("gelöscht"));
  });
});

describe("reading offline", () => {
  it("answers the wardrobe list from the offline copy", async () => {
    setOnline(false);
    await db.items.bulkPut([
      itemFixture({ id: "a", name: "Hemd" }),
      itemFixture({ id: "b", name: "Hose", category: "Hose" }),
    ]);
    const network = vi.spyOn(itemsApi, "fetchItems");

    const page = await loadItems({ category: "Hose" }, null);

    expect(network).not.toHaveBeenCalled();
    expect(page.items.map(({ name }) => name)).toEqual(["Hose"]);
  });
});

describe("the offline copy belongs to one user", () => {
  it("is cleared completely", async () => {
    await db.items.put(itemFixture());
    await db.images.put({ key: "k", blob: new Blob(["x"]) });
    await enqueue({
      type: "updateItem",
      itemId: "a",
      fields: {},
      baseUpdatedAt: "2026-10-01T00:00:00.000Z",
    });

    await clearOfflineData();

    for (const table of db.tables) expect(await table.count(), table.name).toBe(0);
  });

  it("starts empty when another user signs in", async () => {
    await db.items.put(itemFixture());
    session.getSession.mockResolvedValue({ data: { user: { id: "user-2" } }, error: null });

    await requireSession();

    expect(await db.items.count()).toBe(0);
    expect(await db.meta.get("owner")).toEqual({ key: "owner", value: "user-2" });
  });

  it("lets the owner in offline and sends everyone else to the login", async () => {
    setOnline(false);
    session.getSession.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(requireSession()).resolves.toBeUndefined();

    await clearOfflineData();
    await expect(requireSession()).rejects.toMatchObject({ options: { to: "/login" } });
  });
});
