import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { outfitResponseSchema } from "@shared/outfit";

import { newRecordId, storageKey } from "../lib/storage-keys";
import {
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";
import { RelatedRecordNotFoundError } from "./errors";

describe("outfit repository", () => {
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

  const outfits = () => app.repositories.outfits;
  const createItem = (userId: string, name: string) =>
    app.repositories.items.create(userId, { name, category: "Mäntel" });
  const placement = (itemId: string) => ({ itemId, x: 0.25, y: 0.5, scale: 1, zIndex: 0 });

  it("creates an outfit and returns the shared response shape", async () => {
    const outfit = await outfits().create(a.userId, { name: "Büro", occasion: "Arbeit" });

    expect(outfitResponseSchema.parse(outfit)).toEqual(outfit);
    expect(outfit).toMatchObject({ name: "Büro", occasion: "Arbeit", items: [] });
  });

  it("places, moves and removes items on an outfit", async () => {
    const outfit = await outfits().create(a.userId, { name: "Büro" });
    const coat = await createItem(a.userId, "Mantel");
    const shirt = await createItem(a.userId, "Hemd");

    await outfits().setItem(a.userId, outfit.id, placement(coat.id));
    await outfits().setItem(a.userId, outfit.id, { ...placement(shirt.id), zIndex: 2 });
    const moved = await outfits().setItem(a.userId, outfit.id, {
      itemId: coat.id,
      x: 1,
      y: 0,
      scale: 1.5,
      zIndex: 5,
    });

    expect(
      moved?.items.map(({ itemId, x, y, scale, zIndex }) => ({ itemId, x, y, scale, zIndex })),
    ).toEqual([
      { itemId: shirt.id, x: 0.25, y: 0.5, scale: 1, zIndex: 2 },
      { itemId: coat.id, x: 1, y: 0, scale: 1.5, zIndex: 5 },
    ]);

    expect(await outfits().removeItem(a.userId, outfit.id, shirt.id)).toBe(true);
    expect((await outfits().get(a.userId, outfit.id))?.items.map(({ itemId }) => itemId)).toEqual([
      coat.id,
    ]);
  });

  it("does not let another user read, update or delete an outfit", async () => {
    const outfit = await outfits().create(a.userId, { name: "Büro" });

    expect(await outfits().get(b.userId, outfit.id)).toBeNull();
    expect(await outfits().list(b.userId)).toEqual([]);
    expect(await outfits().update(b.userId, outfit.id, { name: "Gekapert" })).toBeNull();
    expect(await outfits().delete(b.userId, outfit.id)).toBe(false);

    expect(await outfits().list(a.userId)).toMatchObject([{ name: "Büro" }]);
  });

  it("does not let another user add to or remove from an outfit", async () => {
    const outfit = await outfits().create(a.userId, { name: "Büro" });
    const coat = await createItem(a.userId, "Mantel");
    const foreignItem = await createItem(b.userId, "Fremd");
    await outfits().setItem(a.userId, outfit.id, placement(coat.id));

    expect(await outfits().setItem(b.userId, outfit.id, placement(foreignItem.id))).toBeNull();
    expect(await outfits().removeItem(b.userId, outfit.id, coat.id)).toBe(false);

    expect((await outfits().get(a.userId, outfit.id))?.items.map(({ itemId }) => itemId)).toEqual([
      coat.id,
    ]);
  });

  it("does not let a user put someone else's item on their own outfit", async () => {
    const outfit = await outfits().create(a.userId, { name: "Büro" });
    const foreignItem = await createItem(b.userId, "Fremd");

    await expect(
      outfits().setItem(a.userId, outfit.id, placement(foreignItem.id)),
    ).rejects.toBeInstanceOf(RelatedRecordNotFoundError);
    expect((await outfits().get(a.userId, outfit.id))?.items).toEqual([]);
  });

  it("removes placements when the item or the outfit is deleted", async () => {
    const outfit = await outfits().create(a.userId, { name: "Büro" });
    const other = await outfits().create(a.userId, { name: "Wochenende" });
    const coat = await createItem(a.userId, "Mantel");
    const shirt = await createItem(a.userId, "Hemd");
    await outfits().setItem(a.userId, outfit.id, placement(coat.id));
    await outfits().setItem(a.userId, outfit.id, placement(shirt.id));
    await outfits().setItem(a.userId, other.id, placement(shirt.id));

    await app.repositories.items.delete(a.userId, coat.id);
    expect((await outfits().get(a.userId, outfit.id))?.items.map(({ itemId }) => itemId)).toEqual([
      shirt.id,
    ]);

    expect(await outfits().delete(a.userId, outfit.id)).toBe(true);
    expect(await app.prisma.outfitItem.count()).toBe(1);
    expect(await app.repositories.items.get(a.userId, shirt.id)).not.toBeNull();
  });

  it("removes all of a user's data with the account and nothing of anyone else", async () => {
    const receiptId = newRecordId();
    await app.repositories.receipts.create(a.userId, {
      id: receiptId,
      fileKey: storageKey(a.userId, receiptId, "beleg.pdf"),
      source: "EMAIL",
    });
    const coat = await createItem(a.userId, "Mantel");
    const outfit = await outfits().create(a.userId, { name: "Büro" });
    await outfits().setItem(a.userId, outfit.id, placement(coat.id));
    await createItem(b.userId, "Bleibt");
    await outfits().create(b.userId, { name: "Bleibt" });

    await app.prisma.user.delete({ where: { id: a.userId } });

    expect(await app.prisma.item.count({ where: { userId: a.userId } })).toBe(0);
    expect(await app.prisma.receipt.count()).toBe(0);
    expect(await app.prisma.outfit.count({ where: { userId: a.userId } })).toBe(0);
    expect(await app.prisma.outfitItem.count()).toBe(0);
    expect(await app.repositories.items.list(b.userId)).toHaveLength(1);
    expect(await outfits().list(b.userId)).toHaveLength(1);
  });
});
