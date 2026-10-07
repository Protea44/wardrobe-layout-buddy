import { describe, expect, it } from "vitest";

import { itemCreateSchema, itemUpdateSchema } from "@shared/item";
import { outfitItemSchema } from "@shared/outfit";
import { receiptUpdateSchema } from "@shared/receipt";

describe("shared item schemas", () => {
  it("accepts a minimal and a full item", () => {
    expect(itemCreateSchema.safeParse({ name: "Mantel", category: "Mäntel" }).success).toBe(true);
    expect(
      itemCreateSchema.safeParse({
        name: " Mantel ",
        category: "Mäntel",
        price: "1234.56",
        currency: "EUR",
        purchaseDate: "2026-02-28",
        productUrl: "https://example.test/mantel",
        seasons: ["herbst", "winter"],
        notes: null,
      }),
    ).toMatchObject({ success: true, data: { name: "Mantel" } });
  });

  it("rejects malformed prices, dates, links and seasons", () => {
    const base = { name: "Mantel", category: "Mäntel" };
    for (const invalid of [
      { price: "12,50" },
      { price: "12.345" },
      { price: "-1" },
      { purchaseDate: "2026-02-30" },
      { purchaseDate: "28.02.2026" },
      { productUrl: "javascript:alert(1)" },
      { seasons: ["winter", "winter"] },
      { seasons: ["monsun"] },
      { name: "   " },
    ]) {
      expect(
        itemCreateSchema.safeParse({ ...base, ...invalid }).success,
        JSON.stringify(invalid),
      ).toBe(false);
    }
  });

  it("does not let a client set photo keys, the owner or sharing flags", () => {
    const base = { name: "Mantel", category: "Mäntel" };
    for (const forbidden of [
      { photoKey: "other-user/x/foto.jpg" },
      { userId: "other-user" },
      { visibility: "PUBLIC" },
      { isForSale: true },
    ]) {
      expect(itemCreateSchema.safeParse({ ...base, ...forbidden }).success).toBe(false);
      expect(itemUpdateSchema.safeParse(forbidden).success).toBe(false);
    }
  });

  it("allows a partial update including the lifecycle status", () => {
    expect(itemUpdateSchema.safeParse({ lifecycleStatus: "SOLD", color: null }).success).toBe(true);
    expect(itemUpdateSchema.safeParse({ lifecycleStatus: "LOST" }).success).toBe(false);
  });
});

describe("shared outfit and receipt schemas", () => {
  it("keeps outfit positions between 0 and 1 and fills in defaults", () => {
    expect(outfitItemSchema.parse({ itemId: "item-1", x: 0, y: 1 })).toEqual({
      itemId: "item-1",
      x: 0,
      y: 1,
      scale: 1,
      zIndex: 0,
    });
    expect(outfitItemSchema.safeParse({ itemId: "item-1", x: 1.01, y: 0 }).success).toBe(false);
    expect(outfitItemSchema.safeParse({ itemId: "item-1", x: 0, y: -0.1 }).success).toBe(false);
  });

  it("does not let a client set a receipt's file key or parse status", () => {
    expect(receiptUpdateSchema.safeParse({ merchant: "Kaufhaus" }).success).toBe(true);
    expect(receiptUpdateSchema.safeParse({ fileKey: "x/y/z.pdf" }).success).toBe(false);
    expect(receiptUpdateSchema.safeParse({ parseStatus: "PARSED" }).success).toBe(false);
  });
});
