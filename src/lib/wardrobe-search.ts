import { z } from "zod";

import { itemSortSchema, seasonSchema, type ItemSort, type Season } from "@shared/item";

import { filterLabels } from "@/config/wardrobe";
import { seasonLabels } from "@/config/items";

// Broken or outdated values in the URL are dropped instead of failing the page.
const text = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional()
  .catch(undefined);

// Search, filters and sort of /profil/schrank, kept in the URL.
export const wardrobeSearchSchema = z.object({
  q: text,
  category: text,
  color: text,
  brand: text,
  season: seasonSchema.optional().catch(undefined),
  sort: itemSortSchema.optional().catch(undefined),
});

export type WardrobeSearch = {
  q?: string;
  category?: string;
  color?: string;
  brand?: string;
  season?: Season;
  sort?: ItemSort;
};

export const FILTER_KEYS = ["category", "color", "brand", "season"] as const;
export type FilterKey = (typeof FILTER_KEYS)[number];

// Leaves out unset values, so the URL only holds what was chosen.
export function parseWardrobeSearch(search: Record<string, unknown>): WardrobeSearch {
  const parsed = wardrobeSearchSchema.parse(search);
  return Object.fromEntries(
    Object.entries(parsed).filter(([, value]) => value !== undefined),
  ) as WardrobeSearch;
}

export function filterValueLabel(key: FilterKey, value: string) {
  return key === "season" ? (seasonLabels[value as Season] ?? value) : value;
}

export type ActiveFilter = { key: FilterKey; value: string; label: string };

export function activeFilters(search: WardrobeSearch): ActiveFilter[] {
  return FILTER_KEYS.flatMap((key) => {
    const value = search[key];
    if (value === undefined) return [];
    return [{ key, value, label: `${filterLabels[key].label}: ${filterValueLabel(key, value)}` }];
  });
}

// The same search without one filter, or without any filter and search text.
export function withoutFilter(search: WardrobeSearch, key: FilterKey): WardrobeSearch {
  const next = { ...search };
  delete next[key];
  return next;
}

export function withoutAllFilters(search: WardrobeSearch): WardrobeSearch {
  return search.sort === undefined ? {} : { sort: search.sort };
}

// Query string for GET /api/items.
export function itemListQuery(search: WardrobeSearch, cursor: string | null) {
  const params = new URLSearchParams();
  for (const key of ["q", ...FILTER_KEYS, "sort"] as const) {
    const value = search[key];
    if (value !== undefined) params.set(key, value);
  }
  if (cursor !== null) params.set("cursor", cursor);
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}

export function itemCountLabel(count: number) {
  return count === 1 ? "1 Teil" : `${count.toLocaleString("de-DE")} Teile`;
}
