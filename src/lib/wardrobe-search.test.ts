import { describe, expect, it } from "vitest";

import { formatPrice } from "@/lib/format";
import {
  activeFilters,
  itemCountLabel,
  itemListQuery,
  parseWardrobeSearch,
  withoutAllFilters,
  withoutFilter,
} from "@/lib/wardrobe-search";

describe("parseWardrobeSearch", () => {
  it("keeps valid values and drops broken or empty ones", () => {
    expect(
      parseWardrobeSearch({
        q: " leinen ",
        category: "Hose",
        color: "",
        season: "monsun",
        sort: "priceAsc",
        brand: 42,
      }),
    ).toEqual({ q: "leinen", category: "Hose", sort: "priceAsc" });
  });
});

describe("filters", () => {
  const search = { q: "hemd", category: "Oberteil", season: "sommer", sort: "priceDesc" } as const;

  it("lists active filters with German labels", () => {
    expect(activeFilters(search)).toEqual([
      { key: "category", value: "Oberteil", label: "Kategorie: Oberteil" },
      { key: "season", value: "sommer", label: "Saison: Sommer" },
    ]);
  });

  it("removes one filter or all of them, keeping the sort", () => {
    expect(withoutFilter(search, "category")).toEqual({
      q: "hemd",
      season: "sommer",
      sort: "priceDesc",
    });
    expect(withoutAllFilters(search)).toEqual({ sort: "priceDesc" });
    expect(withoutAllFilters({ category: "Rock" })).toEqual({});
  });

  it("builds the API query string", () => {
    expect(itemListQuery(search, null)).toBe(
      "?q=hemd&category=Oberteil&season=sommer&sort=priceDesc",
    );
    expect(itemListQuery({ brand: "H&M" }, "abc")).toBe("?brand=H%26M&cursor=abc");
    expect(itemListQuery({}, null)).toBe("");
  });
});

describe("labels", () => {
  it("counts items in German", () => {
    expect(itemCountLabel(1)).toBe("1 Teil");
    expect(itemCountLabel(0)).toBe("0 Teile");
    expect(itemCountLabel(1234)).toBe("1.234 Teile");
  });

  it("formats prices as 1.234,56 €", () => {
    expect(formatPrice("1234.56")).toBe("1.234,56 €");
    expect(formatPrice("9.9")).toBe("9,90 €");
  });
});
