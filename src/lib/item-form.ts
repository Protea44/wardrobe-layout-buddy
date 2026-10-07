import { z } from "zod";

import { dateOnlySchema } from "@shared/common";
import {
  itemCategories,
  itemColorSchema,
  seasonSchema,
  type ItemCategory,
  type ItemColor,
  type ItemUploadInput,
} from "@shared/item";

const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label} darf höchstens ${max} Zeichen lang sein.`);

// "49,90", "1.234,56" and "49.90" all become "49.90"; null if not a price.
export function normalizePrice(value: string): string | null {
  const compact = value.replace(/\s|€/g, "");
  const decimal = compact.includes(",") ? compact.replace(/\./g, "").replace(",", ".") : compact;
  return /^\d{1,8}(\.\d{1,2})?$/.test(decimal) ? decimal : null;
}

const isCategory = (value: string): value is ItemCategory =>
  (itemCategories as readonly string[]).includes(value);

// What the capture form holds: every input is a string, empty means "not set".
export const itemFormSchema = z.object({
  category: z.string().refine(isCategory, "Bitte wähle eine Kategorie."),
  color: z.union([itemColorSchema, z.literal("")]),
  name: optionalText("Der Name", 120),
  brand: optionalText("Die Marke", 80),
  size: optionalText("Die Größe", 40),
  price: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || normalizePrice(value) !== null,
      "Bitte gib einen gültigen Preis ein, z. B. 49,90.",
    ),
  purchaseDate: z
    .string()
    .refine(
      (value) => value === "" || dateOnlySchema.safeParse(value).success,
      "Bitte gib ein gültiges Datum ein.",
    ),
  material: optionalText("Das Material", 120),
  retailer: optionalText("Der Händler", 120),
  seasons: z.array(seasonSchema),
  notes: optionalText("Die Notiz", 5000),
});

export type ItemFormInput = z.input<typeof itemFormSchema>;
export type ItemFormValues = z.output<typeof itemFormSchema>;

export const emptyItemForm: ItemFormInput = {
  category: "",
  color: "",
  name: "",
  brand: "",
  size: "",
  price: "",
  purchaseDate: "",
  material: "",
  retailer: "",
  seasons: [],
  notes: "",
};

// Name used when the user leaves the field empty, e.g. "Blau Oberteil".
export function defaultItemName(color: ItemColor | "", category: string) {
  return [color, category].filter((part) => part !== "").join(" ");
}

// Leaves out empty fields, so nothing is stored for them.
export function toItemUploadInput(values: ItemFormValues): ItemUploadInput {
  const price = values.price === "" ? null : normalizePrice(values.price);

  return {
    name: values.name || defaultItemName(values.color, values.category),
    category: values.category,
    ...(values.color !== "" && { color: values.color }),
    ...(values.brand !== "" && { brand: values.brand }),
    ...(values.size !== "" && { size: values.size }),
    ...(price !== null && { price }),
    ...(values.purchaseDate !== "" && { purchaseDate: values.purchaseDate }),
    ...(values.material !== "" && { material: values.material }),
    ...(values.retailer !== "" && { retailer: values.retailer }),
    ...(values.seasons.length > 0 && { seasons: values.seasons }),
    ...(values.notes !== "" && { notes: values.notes }),
  };
}
