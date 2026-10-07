import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { itemResponseSchema } from "@shared/item";

import { newRecordId, storageKey } from "../lib/storage-keys";
import {
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";
import { InvalidStorageKeyError, RelatedRecordNotFoundError } from "./errors";

describe("item repository", () => {
  let app: TestApp;
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    app = await buildTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    ({ a, b } = await createTwoUsers(app));
  });
  afterAll(() => app.close());

  const items = () => app.repositories.items;

  function createReceipt(userId: string) {
    const id = newRecordId();
    return app.repositories.receipts.create(userId, {
      id,
      fileKey: storageKey(userId, id, "beleg.pdf"),
      source: "UPLOAD",
    });
  }

  it("creates an item with defaults and returns the shared response shape", async () => {
    const item = await items().create(a.userId, {
      name: "Wollmantel",
      category: "Mäntel",
      price: "189.9",
      purchaseDate: "2026-02-28",
      seasons: ["herbst", "winter"],
      productUrl: "https://example.test/mantel",
    });

    expect(itemResponseSchema.parse(item)).toEqual(item);
    expect(item).toMatchObject({
      name: "Wollmantel",
      price: "189.90",
      currency: "EUR",
      purchaseDate: "2026-02-28",
      seasons: ["herbst", "winter"],
      visibility: "PRIVATE",
      isForSale: false,
      isTradeable: false,
      isLinkable: false,
      lifecycleStatus: "ACTIVE",
      photoKey: null,
      receiptId: null,
    });
  });

  it("lists only the user's own items and filters by category and brand", async () => {
    await items().create(a.userId, { name: "Mantel", category: "Mäntel", brand: "Acme" });
    await items().create(a.userId, { name: "Hemd", category: "Hemden", brand: "Acme" });
    await items().create(b.userId, { name: "Fremd", category: "Mäntel", brand: "Acme" });

    expect((await items().list(a.userId)).map(({ name }) => name).sort()).toEqual([
      "Hemd",
      "Mantel",
    ]);
    expect((await items().list(a.userId, { category: "Mäntel" })).map(({ name }) => name)).toEqual([
      "Mantel",
    ]);
    expect((await items().list(b.userId, { brand: "Acme" })).map(({ name }) => name)).toEqual([
      "Fremd",
    ]);
  });

  it("updates and clears fields without touching the ones left out", async () => {
    const item = await items().create(a.userId, {
      name: "Mantel",
      category: "Mäntel",
      color: "Navy",
      notes: "Geschenk",
    });

    const updated = await items().update(a.userId, item.id, {
      color: null,
      lifecycleStatus: "SORTED_OUT",
    });

    expect(updated).toMatchObject({
      name: "Mantel",
      color: null,
      notes: "Geschenk",
      lifecycleStatus: "SORTED_OUT",
    });
  });

  it("does not let another user read, update, re-photo or delete an item", async () => {
    const item = await items().create(a.userId, { name: "Mantel", category: "Mäntel" });

    expect(await items().get(b.userId, item.id)).toBeNull();
    expect(await items().list(b.userId)).toEqual([]);
    expect(await items().update(b.userId, item.id, { name: "Gekapert" })).toBeNull();
    expect(
      await items().setPhoto(b.userId, item.id, {
        photoKey: storageKey(b.userId, item.id, "foto.jpg"),
        thumbnailKey: null,
      }),
    ).toBeNull();
    expect(await items().delete(b.userId, item.id)).toBe(false);

    expect(await items().get(a.userId, item.id)).toMatchObject({ name: "Mantel", photoKey: null });
  });

  it("keeps an item private to its owner even when it is marked public", async () => {
    const item = await items().create(a.userId, { name: "Mantel", category: "Mäntel" });
    await app.prisma.item.update({ where: { id: item.id }, data: { visibility: "PUBLIC" } });

    expect(await items().get(b.userId, item.id)).toBeNull();
    expect(await items().list(b.userId)).toEqual([]);
  });

  it("stores photo keys only below the user's own item", async () => {
    const item = await items().create(a.userId, { name: "Mantel", category: "Mäntel" });
    const photoKey = storageKey(a.userId, item.id, "foto.jpg");
    const thumbnailKey = storageKey(a.userId, item.id, "foto-klein.jpg");

    expect(await items().setPhoto(a.userId, item.id, { photoKey, thumbnailKey })).toMatchObject({
      photoKey,
      thumbnailKey,
    });

    for (const foreignKey of [
      storageKey(b.userId, item.id, "foto.jpg"),
      storageKey(a.userId, newRecordId(), "foto.jpg"),
      `${a.userId}/${item.id}/../${b.userId}/foto.jpg`,
    ]) {
      await expect(
        items().setPhoto(a.userId, item.id, { photoKey: foreignKey, thumbnailKey: null }),
      ).rejects.toBeInstanceOf(InvalidStorageKeyError);
    }
    expect(await items().get(a.userId, item.id)).toMatchObject({ photoKey, thumbnailKey });
  });

  it("links an item only to a receipt of the same user", async () => {
    const own = await createReceipt(a.userId);
    const foreign = await createReceipt(b.userId);

    const item = await items().create(a.userId, {
      name: "Mantel",
      category: "Mäntel",
      receiptId: own.id,
    });
    expect(item.receiptId).toBe(own.id);

    await expect(
      items().create(a.userId, { name: "Hemd", category: "Hemden", receiptId: foreign.id }),
    ).rejects.toBeInstanceOf(RelatedRecordNotFoundError);
    await expect(
      items().update(a.userId, item.id, { receiptId: foreign.id }),
    ).rejects.toBeInstanceOf(RelatedRecordNotFoundError);
    expect((await items().get(a.userId, item.id))?.receiptId).toBe(own.id);
  });

  it("deletes an item for its owner", async () => {
    const item = await items().create(a.userId, { name: "Mantel", category: "Mäntel" });

    expect(await items().delete(a.userId, item.id)).toBe(true);
    expect(await items().get(a.userId, item.id)).toBeNull();
  });
});
