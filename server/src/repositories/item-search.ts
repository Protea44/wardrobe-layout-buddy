import type { ItemListQuery, ItemSort } from "@shared/item";

import type { Item, Prisma } from "../generated/prisma/client";

type SortField = "createdAt" | "purchaseDate" | "price";

type SortSpec = {
  field: SortField;
  direction: "asc" | "desc";
  nullable: boolean;
};

// Every sort ends on the id, so the order is total and a cursor is exact.
// Items without a value come last.
const SORTS: Record<ItemSort, SortSpec> = {
  newest: { field: "createdAt", direction: "desc", nullable: false },
  purchaseDate: { field: "purchaseDate", direction: "desc", nullable: true },
  priceAsc: { field: "price", direction: "asc", nullable: true },
  priceDesc: { field: "price", direction: "desc", nullable: true },
};

export function orderBy(sort: ItemSort): Prisma.ItemOrderByWithRelationInput[] {
  const { field, direction, nullable } = SORTS[sort];
  return [{ [field]: nullable ? { sort: direction, nulls: "last" } : direction }, { id: "asc" }];
}

// The sort value and id of the last item of a page.
type Cursor = { value: string | null; id: string };

export class InvalidCursorError extends Error {
  constructor() {
    super("Invalid cursor");
    this.name = "InvalidCursorError";
  }
}

function sortValue(item: Item, field: SortField): string | null {
  const value = item[field];
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value.toFixed(2);
}

export function encodeCursor(item: Item, sort: ItemSort) {
  const cursor: Cursor = { value: sortValue(item, SORTS[sort].field), id: item.id };
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(encoded: string): Cursor {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "id" in parsed &&
      "value" in parsed &&
      typeof parsed.id === "string" &&
      (typeof parsed.value === "string" || parsed.value === null)
    ) {
      return { id: parsed.id, value: parsed.value };
    }
  } catch {
    // Falls through to the error below.
  }
  throw new InvalidCursorError();
}

function columnValue(field: SortField, value: string) {
  if (field === "price") {
    if (!/^\d{1,8}\.\d{2}$/.test(value)) throw new InvalidCursorError();
    return value;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new InvalidCursorError();
  return date;
}

// Items that come after the cursor in the given sort.
export function afterCursor(encoded: string, sort: ItemSort): Prisma.ItemWhereInput {
  const { field, direction, nullable } = SORTS[sort];
  const cursor = decodeCursor(encoded);

  // Past the last value: only items without a value remain, ordered by id.
  if (cursor.value === null) {
    if (!nullable) throw new InvalidCursorError();
    return { [field]: null, id: { gt: cursor.id } };
  }

  const value = columnValue(field, cursor.value);
  return {
    OR: [
      { [field]: { [direction === "desc" ? "lt" : "gt"]: value } },
      { [field]: value, id: { gt: cursor.id } },
      ...(nullable ? [{ [field]: null }] : []),
    ],
  };
}

// Filters and search of GET /api/items; only active items.
export function filterWhere(userId: string, query: ItemListQuery): Prisma.ItemWhereInput {
  const contains = (q: string) => ({ contains: q, mode: "insensitive" as const });
  return {
    userId,
    lifecycleStatus: "ACTIVE",
    ...(query.category !== undefined && { category: query.category }),
    ...(query.color !== undefined && { color: query.color }),
    ...(query.brand !== undefined && { brand: query.brand }),
    ...(query.season !== undefined && { seasons: { has: query.season } }),
    ...(query.q !== undefined && {
      OR: [
        { name: contains(query.q) },
        { brand: contains(query.q) },
        { material: contains(query.q) },
        { notes: contains(query.q) },
      ],
    }),
  };
}
