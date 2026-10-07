import type { Season } from "@shared/item";

export const seasonLabels: Record<Season, string> = {
  fruehling: "Frühling",
  sommer: "Sommer",
  herbst: "Herbst",
  winter: "Winter",
  ganzjaehrig: "Ganzjährig",
};

// The wardrobe overview does not exist yet; the profile stands in for it.
export const WARDROBE_PATH = "/profil";
export const ADD_ITEM_PATH = "/teil-hinzufuegen";
