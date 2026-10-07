import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { receiptResponseSchema } from "@shared/receipt";

import { newRecordId, storageKey } from "../lib/storage-keys";
import {
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";
import { InvalidStorageKeyError } from "./errors";

describe("receipt repository", () => {
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

  const receipts = () => app.repositories.receipts;

  function createFor(userId: string, merchant?: string) {
    const id = newRecordId();
    return receipts().create(userId, {
      id,
      fileKey: storageKey(userId, id, "beleg.pdf"),
      source: "UPLOAD",
      ...(merchant !== undefined && { merchant }),
    });
  }

  it("creates a receipt with defaults and returns the shared response shape", async () => {
    const receipt = await createFor(a.userId, "Kaufhaus");

    expect(receiptResponseSchema.parse(receipt)).toEqual(receipt);
    expect(receipt).toMatchObject({
      source: "UPLOAD",
      merchant: "Kaufhaus",
      purchaseDate: null,
      parseStatus: "PENDING",
    });
    expect(receipt.fileKey).toBe(`${a.userId}/${receipt.id}/beleg.pdf`);
  });

  it("refuses a file key outside the user's own record", async () => {
    const id = newRecordId();

    for (const fileKey of [
      storageKey(b.userId, id, "beleg.pdf"),
      storageKey(a.userId, newRecordId(), "beleg.pdf"),
    ]) {
      await expect(
        receipts().create(a.userId, { id, fileKey, source: "UPLOAD" }),
      ).rejects.toBeInstanceOf(InvalidStorageKeyError);
    }
    expect(await receipts().list(a.userId)).toEqual([]);
  });

  it("lists only the user's own receipts", async () => {
    await createFor(a.userId, "Eigener Laden");
    await createFor(b.userId, "Fremder Laden");

    expect((await receipts().list(a.userId)).map(({ merchant }) => merchant)).toEqual([
      "Eigener Laden",
    ]);
  });

  it("marks a receipt as manually maintained when its details are edited", async () => {
    const receipt = await createFor(a.userId);

    const updated = await receipts().update(a.userId, receipt.id, {
      merchant: "Kaufhaus",
      purchaseDate: "2026-03-14",
    });

    expect(updated).toMatchObject({
      merchant: "Kaufhaus",
      purchaseDate: "2026-03-14",
      parseStatus: "MANUAL",
    });
  });

  it("does not let another user read, update or delete a receipt", async () => {
    const receipt = await createFor(a.userId, "Kaufhaus");

    expect(await receipts().get(b.userId, receipt.id)).toBeNull();
    expect(await receipts().list(b.userId)).toEqual([]);
    expect(await receipts().update(b.userId, receipt.id, { merchant: "Gekapert" })).toBeNull();
    expect(await receipts().delete(b.userId, receipt.id)).toBe(false);

    expect(await receipts().get(a.userId, receipt.id)).toMatchObject({
      merchant: "Kaufhaus",
      parseStatus: "PENDING",
    });
  });

  it("deletes a receipt for its owner and keeps the linked item", async () => {
    const receipt = await createFor(a.userId);
    const item = await app.repositories.items.create(a.userId, {
      name: "Mantel",
      category: "Mäntel",
      receiptId: receipt.id,
    });

    expect(await receipts().delete(a.userId, receipt.id)).toBe(true);

    expect(await receipts().get(a.userId, receipt.id)).toBeNull();
    expect(await app.repositories.items.get(a.userId, item.id)).toMatchObject({ receiptId: null });
  });
});
