import type { ItemSort } from "@shared/item";

export const WARDROBE_PATH = "/profil/schrank";

export const sortOptions: { value: ItemSort; label: string }[] = [
  { value: "newest", label: "Neueste zuerst" },
  { value: "purchaseDate", label: "Kaufdatum" },
  { value: "priceAsc", label: "Preis aufsteigend" },
  { value: "priceDesc", label: "Preis absteigend" },
];

export const filterLabels = {
  category: { label: "Kategorie", all: "Alle Kategorien" },
  color: { label: "Farbe", all: "Alle Farben" },
  brand: { label: "Marke", all: "Alle Marken" },
  season: { label: "Saison", all: "Alle Saisons" },
} as const;

// Wait this long after the last keystroke before searching.
export const SEARCH_DEBOUNCE_MS = 300;
