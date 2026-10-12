import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { itemResponseSchema, type ItemResponse } from "@shared/item";
import { receiptResponseSchema } from "@shared/receipt";

import { newRecordId, storageKey } from "../lib/storage-keys";
import {
  browserHeaders,
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";
import { createMemoryStorage } from "../test/memory-storage";
import { encodeMultipart, fakeJpeg, fakePdf, fakeWebp } from "../test/multipart";

describe("item detail routes", () => {
  let app: TestApp;
  let memory: ReturnType<typeof createMemoryStorage>;
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    memory = createMemoryStorage();
    app = await buildTestApp({ storage: memory.storage });
  });
  beforeEach(async () => {
    memory.objects.clear();
    await resetDatabase(app);
    ({ a, b } = await createTwoUsers(app));
  });
  afterAll(() => app.close());

  // An item with stored photo and thumbnail, as the upload creates it.
  async function createItem(user: TestUser, name = "Leinenhemd") {
    const id = newRecordId();
    await app.repositories.items.create(
      user.userId,
      { name, category: "Oberteil", color: "Weiß", brand: "Marke", notes: "Notiz" },
      id,
    );
    const photoKey = storageKey(user.userId, id, "photo.webp");
    const thumbnailKey = storageKey(user.userId, id, "thumbnail.webp");
    await memory.storage.putObject("item-photos", photoKey, fakeWebp(), "image/webp");
    await memory.storage.putObject("item-photos", thumbnailKey, fakeWebp(), "image/webp");
    const item = await app.repositories.items.setPhoto(user.userId, id, { photoKey, thumbnailKey });
    if (item === null) throw new Error("item missing");
    return item;
  }

  function patch(id: string, cookie: string | undefined, payload: unknown) {
    return app.inject({
      method: "PATCH",
      url: `/api/items/${id}`,
      headers: browserHeaders(app, cookie),
      payload: payload as Record<string, unknown>,
    });
  }

  function remove(id: string, cookie?: string) {
    return app.inject({
      method: "DELETE",
      url: `/api/items/${id}`,
      headers: browserHeaders(app, cookie),
    });
  }

  async function replacePhoto(id: string, cookie: string | undefined, photo = fakeJpeg()) {
    const form = new FormData();
    form.append("photo", new Blob([photo], { type: "image/jpeg" }), "photo.jpg");
    form.append("thumbnail", new Blob([fakeWebp()], { type: "image/webp" }), "thumb.webp");
    const { contentType, payload } = await encodeMultipart(form);
    return app.inject({
      method: "PUT",
      url: `/api/items/${id}/photo`,
      headers: { ...browserHeaders(app, cookie), "content-type": contentType },
      payload,
    });
  }

  const stored = (key: string | null) => memory.objects.has(`item-photos/${key}`);

  describe("PATCH /api/items/:id", () => {
    it("requires a session", async () => {
      const item = await createItem(a);
      expect((await patch(item.id, undefined, { name: "Neu" })).statusCode).toBe(401);
    });

    it("changes the fields sent, clears those sent as null and keeps the rest", async () => {
      const item = await createItem(a);

      const response = await patch(item.id, a.cookie, {
        name: "Sommerhemd",
        category: "Strick",
        color: null,
        price: "39.90",
        seasons: ["sommer"],
        notes: null,
      });

      expect(response.statusCode).toBe(200);
      const updated = itemResponseSchema.parse(response.json());
      expect(updated).toMatchObject({
        name: "Sommerhemd",
        category: "Strick",
        color: null,
        price: "39.90",
        seasons: ["sommer"],
        notes: null,
        brand: "Marke",
        visibility: "PRIVATE",
        photoKey: item.photoKey,
      });
    });

    it("answers 404 for another user's item and leaves it unchanged", async () => {
      const item = await createItem(a);

      const response = await patch(item.id, b.cookie, { name: "Gestohlen" });

      expect(response.statusCode).toBe(404);
      expect((await app.repositories.items.get(a.userId, item.id))?.name).toBe("Leinenhemd");
    });

    it("refuses fields outside the lists, sharing flags and the lifecycle status", async () => {
      const item = await createItem(a);

      for (const payload of [
        { category: "Mäntel" },
        { color: "Türkis" },
        { visibility: "PUBLIC" },
        { isForSale: true },
        { lifecycleStatus: "SOLD" },
        { name: "" },
        { photoKey: `${b.userId}/x/photo.webp` },
      ]) {
        const response = await patch(item.id, a.cookie, payload);
        expect(response.statusCode, JSON.stringify(payload)).toBe(400);
      }
    });

    it("answers 404 when linking another user's receipt", async () => {
      const item = await createItem(a);
      const receiptId = newRecordId();
      await app.repositories.receipts.create(b.userId, {
        id: receiptId,
        fileKey: storageKey(b.userId, receiptId, "beleg.pdf"),
        source: "UPLOAD",
      });

      expect((await patch(item.id, a.cookie, { receiptId })).statusCode).toBe(404);
    });
  });

  describe("DELETE /api/items/:id", () => {
    it("requires a session", async () => {
      const item = await createItem(a);
      expect((await remove(item.id)).statusCode).toBe(401);
    });

    it("removes the item, its files and its outfit links", async () => {
      const item = await createItem(a);
      const other = await createItem(a, "Bleibt");
      const outfit = await app.repositories.outfits.create(a.userId, { name: "Büro" });
      for (const itemId of [item.id, other.id]) {
        await app.repositories.outfits.setItem(a.userId, outfit.id, {
          itemId,
          x: 0.5,
          y: 0.5,
          scale: 1,
          zIndex: 0,
        });
      }

      const response = await remove(item.id, a.cookie);

      expect(response.statusCode).toBe(204);
      expect(await app.repositories.items.get(a.userId, item.id)).toBeNull();
      expect(stored(item.photoKey)).toBe(false);
      expect(stored(item.thumbnailKey)).toBe(false);
      expect(stored(other.photoKey)).toBe(true);
      const remaining = await app.repositories.outfits.get(a.userId, outfit.id);
      expect(remaining?.items.map(({ itemId }) => itemId)).toEqual([other.id]);
    });

    it("answers 404 for another user's item and deletes nothing", async () => {
      const item = await createItem(a);

      expect((await remove(item.id, b.cookie)).statusCode).toBe(404);
      expect(await app.repositories.items.get(a.userId, item.id)).not.toBeNull();
      expect(stored(item.photoKey)).toBe(true);
    });
  });

  describe("PUT /api/items/:id/photo", () => {
    it("requires a session", async () => {
      const item = await createItem(a);
      expect((await replacePhoto(item.id, undefined)).statusCode).toBe(401);
    });

    it("stores the new files under new names and removes the old ones", async () => {
      const item = await createItem(a);

      const response = await replacePhoto(item.id, a.cookie);

      expect(response.statusCode).toBe(200);
      const updated: ItemResponse = itemResponseSchema.parse(response.json());
      expect(updated.photoKey).toMatch(
        new RegExp(`^${a.userId}/${item.id}/photo-[0-9a-f]{8}\\.jpg$`),
      );
      expect(updated.thumbnailKey).toMatch(/thumbnail-[0-9a-f]{8}\.webp$/);
      expect(memory.objects.get(`item-photos/${updated.photoKey}`)?.contentType).toBe("image/jpeg");
      expect(stored(updated.thumbnailKey)).toBe(true);
      expect(stored(item.photoKey)).toBe(false);
      expect(stored(item.thumbnailKey)).toBe(false);
    });

    it("answers 404 for another user's item and stores nothing", async () => {
      const item = await createItem(a);
      const before = memory.objects.size;

      expect((await replacePhoto(item.id, b.cookie)).statusCode).toBe(404);
      expect(memory.objects.size).toBe(before);
      expect((await app.repositories.items.get(a.userId, item.id))?.photoKey).toBe(item.photoKey);
    });

    it("refuses files that are not really images", async () => {
      const item = await createItem(a);

      expect((await replacePhoto(item.id, a.cookie, fakePdf())).statusCode).toBe(415);
      expect((await app.repositories.items.get(a.userId, item.id))?.photoKey).toBe(item.photoKey);
    });
  });

  describe("GET /api/receipts/:id", () => {
    it("returns the owner's receipt and 404 to anyone else", async () => {
      const id = newRecordId();
      await app.repositories.receipts.create(a.userId, {
        id,
        fileKey: storageKey(a.userId, id, "beleg.pdf"),
        source: "UPLOAD",
        merchant: "Modehaus",
      });
      const get = (cookie?: string) =>
        app.inject({
          method: "GET",
          url: `/api/receipts/${id}`,
          headers: browserHeaders(app, cookie),
        });

      const own = await get(a.cookie);

      expect(own.statusCode).toBe(200);
      expect(receiptResponseSchema.parse(own.json()).merchant).toBe("Modehaus");
      expect((await get(b.cookie)).statusCode).toBe(404);
      expect((await get()).statusCode).toBe(401);
    });
  });
});
