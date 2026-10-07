import { describe, expect, it } from "vitest";

import { facetsOf, queryItems } from "@/lib/offline/local-query";
import { itemFixture } from "@/test/fixtures";

const items = [
  itemFixture({
    id: "a",
    name: "Leinenhemd",
    price: "49.90",
    purchaseDate: "2026-03-01",
    createdAt: "2026-01-01T00:00:00.000Z",
  }),
  itemFixture({
    id: "b",
    name: "Chino",
    category: "Hose",
    brand: "LEINEN & Co",
    price: null,
    purchaseDate: null,
    seasons: ["winter"],
    createdAt: "2026-01-03T00:00:00.000Z",
  }),
  itemFixture({
    id: "c",
    name: "Rock",
    category: "Rock",
    brand: null,
    material: "Wolle",
    notes: null,
    price: "9.99",
    purchaseDate: "2026-05-01",
    createdAt: "2026-01-02T00:00:00.000Z",
  }),
  itemFixture({ id: "d", name: "Verkauft", lifecycleStatus: "SOLD" }),
];

const names = (search: Parameters<typeof queryItems>[1]) =>
  queryItems(items, search).items.map((item) => item.name);

describe("offline item query", () => {
  it("lists active items newest first, like the API", () => {
    const page = queryItems(items, {});
    expect(page.items.map(({ id }) => id)).toEqual(["b", "c", "a"]);
    expect(page).toMatchObject({ total: 3, nextCursor: null });
  });

  it("searches name, brand, material and notes case-insensitively", () => {
    expect(names({ q: "leinen" })).toEqual(["Chino", "Leinenhemd"]);
    expect(names({ q: "WOLLE" })).toEqual(["Rock"]);
  });

  it("filters and sorts with missing values last", () => {
    expect(names({ category: "Hose" })).toEqual(["Chino"]);
    expect(names({ season: "winter" })).toEqual(["Chino"]);
    expect(names({ sort: "priceAsc" })).toEqual(["Rock", "Leinenhemd", "Chino"]);
    expect(names({ sort: "priceDesc" })).toEqual(["Leinenhemd", "Rock", "Chino"]);
    expect(names({ sort: "purchaseDate" })).toEqual(["Rock", "Leinenhemd", "Chino"]);
  });

  it("derives the filter options from active items", () => {
    expect(facetsOf(items)).toEqual({
      categories: ["Hose", "Oberteil", "Rock"],
      colors: ["Weiß"],
      brands: ["LEINEN & Co", "Marke"],
      seasons: ["sommer", "winter"],
    });
  });
});
