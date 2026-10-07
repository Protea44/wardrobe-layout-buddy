import {
  seasonSchema,
  type ItemFacets,
  type ItemListResponse,
  type ItemResponse,
} from "@shared/item";

import type { WardrobeSearch } from "@/lib/wardrobe-search";

type Compare = (left: ItemResponse, right: ItemResponse) => number;

// Missing values last, like the API.
function byNullable(value: (item: ItemResponse) => number | null, direction: 1 | -1): Compare {
  return (left, right) => {
    const a = value(left);
    const b = value(right);
    if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
    return (a - b) * direction;
  };
}

const time = (value: string | null) => (value === null ? null : Date.parse(value));
const price = (value: string | null) => (value === null ? null : Number(value));

const SORTS: Record<NonNullable<WardrobeSearch["sort"]>, Compare> = {
  newest: byNullable((item) => time(item.createdAt), -1),
  purchaseDate: byNullable((item) => time(item.purchaseDate), -1),
  priceAsc: byNullable((item) => price(item.price), 1),
  priceDesc: byNullable((item) => price(item.price), -1),
};

// GET /api/items, answered from the offline cache: same filters, search and
// sort, all results on one page.
export function queryItems(items: ItemResponse[], search: WardrobeSearch): ItemListResponse {
  const q = search.q?.toLocaleLowerCase("de");
  const matches = items.filter(
    (item) =>
      item.lifecycleStatus === "ACTIVE" &&
      (search.category === undefined || item.category === search.category) &&
      (search.color === undefined || item.color === search.color) &&
      (search.brand === undefined || item.brand === search.brand) &&
      (search.season === undefined || item.seasons.includes(search.season)) &&
      (q === undefined ||
        [item.name, item.brand, item.material, item.notes].some((text) =>
          text?.toLocaleLowerCase("de").includes(q),
        )),
  );
  const compare = SORTS[search.sort ?? "newest"];
  const sorted = matches.sort(
    (left, right) => compare(left, right) || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0),
  );
  return { items: sorted, total: sorted.length, nextCursor: null };
}

// GET /api/items/facets from the offline cache.
export function facetsOf(items: ItemResponse[]): ItemFacets {
  const active = items.filter((item) => item.lifecycleStatus === "ACTIVE");
  const distinct = (values: (string | null)[]) =>
    [...new Set(values.filter((value): value is string => value !== null))].sort((a, b) =>
      a.localeCompare(b, "de"),
    );
  const seasons = new Set(active.flatMap((item) => item.seasons));
  return {
    categories: distinct(active.map((item) => item.category)),
    colors: distinct(active.map((item) => item.color)),
    brands: distinct(active.map((item) => item.brand)),
    seasons: seasonSchema.options.filter((season) => seasons.has(season)),
  };
}
