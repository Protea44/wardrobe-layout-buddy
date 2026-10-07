import { describe, expect, it } from "vitest";

import { Prisma, type Item } from "../generated/prisma/client";
import { afterCursor, encodeCursor, InvalidCursorError, orderBy } from "./item-search";

const item = (overrides: Partial<Item>) =>
  ({
    id: "item-b",
    createdAt: new Date("2026-01-01T10:00:00.000Z"),
    purchaseDate: null,
    price: null,
    ...overrides,
  }) as Item;

describe("item search cursor", () => {
  it("orders by the sort field with missing values last, then by id", () => {
    expect(orderBy("newest")).toEqual([{ createdAt: "desc" }, { id: "asc" }]);
    expect(orderBy("priceAsc")).toEqual([{ price: { sort: "asc", nulls: "last" } }, { id: "asc" }]);
  });

  it("continues after a value: smaller or equal with a larger id, then the missing ones", () => {
    const cursor = encodeCursor(item({ price: new Prisma.Decimal("49.9") }), "priceDesc");

    expect(afterCursor(cursor, "priceDesc")).toEqual({
      OR: [{ price: { lt: "49.90" } }, { price: "49.90", id: { gt: "item-b" } }, { price: null }],
    });
  });

  it("continues among missing values by id", () => {
    const cursor = encodeCursor(item({}), "purchaseDate");

    expect(afterCursor(cursor, "purchaseDate")).toEqual({
      purchaseDate: null,
      id: { gt: "item-b" },
    });
  });

  it("never adds missing values to a sort on a required field", () => {
    const cursor = encodeCursor(item({}), "newest");

    expect(afterCursor(cursor, "newest")).toEqual({
      OR: [
        { createdAt: { lt: new Date("2026-01-01T10:00:00.000Z") } },
        { createdAt: new Date("2026-01-01T10:00:00.000Z"), id: { gt: "item-b" } },
      ],
    });
  });

  it("rejects forged or mismatched cursors", () => {
    const forge = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    for (const [cursor, sort] of [
      ["%%%", "newest"],
      [forge({ id: "x" }), "newest"],
      [forge({ value: null, id: "x" }), "newest"],
      [forge({ value: "not-a-date", id: "x" }), "newest"],
      [forge({ value: "1e9", id: "x" }), "priceAsc"],
      [forge({ value: 5, id: "x" }), "priceAsc"],
    ] as const) {
      expect(() => afterCursor(cursor, sort), cursor).toThrow(InvalidCursorError);
    }
  });
});
