import type { ItemResponse } from "@shared/item";

// A complete item as the API returns it; override what a test needs.
export function itemFixture(overrides: Partial<ItemResponse> = {}): ItemResponse {
  return {
    id: "item-1",
    name: "Leinenhemd",
    category: "Oberteil",
    color: "Weiß",
    brand: "Marke",
    size: "M",
    price: "49.90",
    currency: "EUR",
    purchaseDate: "2026-05-01",
    material: "Leinen",
    retailer: "Modehaus",
    productUrl: null,
    seasons: ["sommer"],
    notes: "Bügeln",
    photoKey: "user-1/item-1/photo.webp",
    thumbnailKey: "user-1/item-1/thumbnail.webp",
    receiptId: null,
    visibility: "PRIVATE",
    isForSale: false,
    isTradeable: false,
    isLinkable: false,
    lifecycleStatus: "ACTIVE",
    createdAt: "2026-10-07T12:00:00.000Z",
    updatedAt: "2026-10-07T12:00:00.000Z",
    ...overrides,
  };
}
