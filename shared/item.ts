import { z } from "zod";

import { clearable, dateOnlySchema, idSchema, text, timestampSchema } from "./common";

export const seasonSchema = z.enum(["fruehling", "sommer", "herbst", "winter", "ganzjaehrig"]);
export const visibilitySchema = z.enum(["PRIVATE", "LINK", "PUBLIC"]);
export const lifecycleStatusSchema = z.enum(["ACTIVE", "SORTED_OUT", "SOLD", "GIVEN_AWAY"]);

// Money travels as a decimal string ("1234.56") so no rounding happens on the way.
export const priceSchema = z.string().regex(/^\d{1,8}(\.\d{1,2})?$/);

const currencySchema = z.string().regex(/^[A-Z]{3}$/);

const productUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2000)
  // Rendered as a link later, so anything but http(s) is refused.
  .refine((value) => /^https?:\/\//i.test(value), "Only http and https links are allowed");

const seasonsSchema = z
  .array(seasonSchema)
  .max(seasonSchema.options.length)
  .refine((seasons) => new Set(seasons).size === seasons.length, "Duplicate season");

// Fields a user fills in. Photo keys are set by the upload, never by the client,
// and the sharing and sale flags stay untouched until those features exist.
const itemFields = {
  name: text(120),
  category: text(60),
  color: clearable(text(60)),
  brand: clearable(text(80)),
  size: clearable(text(40)),
  price: clearable(priceSchema),
  currency: currencySchema.optional(),
  purchaseDate: clearable(dateOnlySchema),
  material: clearable(text(120)),
  retailer: clearable(text(120)),
  productUrl: clearable(productUrlSchema),
  seasons: seasonsSchema.optional(),
  notes: clearable(text(5000)),
  receiptId: clearable(idSchema),
};

export const itemCreateSchema = z.object(itemFields).strict();

// Quick-select lists of the capture form. The columns stay free text, so the
// lists can change without touching stored items.
export const itemCategories = [
  "Oberteil",
  "Hose",
  "Rock",
  "Kleid",
  "Jacke & Mantel",
  "Strick",
  "Schuhe",
  "Tasche",
  "Accessoire",
  "Sonstiges",
] as const;

export const itemColors = [
  "Schwarz",
  "Weiß",
  "Grau",
  "Beige",
  "Braun",
  "Navy",
  "Blau",
  "Grün",
  "Rot",
  "Rosa",
  "Gelb",
  "Orange",
  "Lila",
  "Mehrfarbig",
] as const;

export const itemCategorySchema = z.enum(itemCategories);
export const itemColorSchema = z.enum(itemColors);

// Largest photo or thumbnail file POST /api/items accepts.
export const ITEM_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

// The "data" part (JSON) of POST /api/items, sent next to the "photo" and
// "thumbnail" files. Category and color must come from the lists above.
export const itemUploadSchema = itemCreateSchema
  .extend({
    category: itemCategorySchema,
    color: clearable(itemColorSchema),
  })
  .strict();

export const itemUpdateSchema = z
  .object({
    ...itemFields,
    name: itemFields.name.optional(),
    category: itemFields.category.optional(),
    lifecycleStatus: lifecycleStatusSchema.optional(),
  })
  .strict();

export const itemResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  category: z.string(),
  color: z.string().nullable(),
  brand: z.string().nullable(),
  size: z.string().nullable(),
  price: priceSchema.nullable(),
  currency: currencySchema,
  purchaseDate: dateOnlySchema.nullable(),
  material: z.string().nullable(),
  retailer: z.string().nullable(),
  productUrl: z.string().nullable(),
  seasons: z.array(seasonSchema),
  notes: z.string().nullable(),
  photoKey: z.string().nullable(),
  thumbnailKey: z.string().nullable(),
  receiptId: idSchema.nullable(),
  visibility: visibilitySchema,
  isForSale: z.boolean(),
  isTradeable: z.boolean(),
  isLinkable: z.boolean(),
  lifecycleStatus: lifecycleStatusSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type Season = z.infer<typeof seasonSchema>;
export type Visibility = z.infer<typeof visibilitySchema>;
export type LifecycleStatus = z.infer<typeof lifecycleStatusSchema>;
export type ItemCategory = z.infer<typeof itemCategorySchema>;
export type ItemColor = z.infer<typeof itemColorSchema>;
export type ItemUploadInput = z.infer<typeof itemUploadSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
export type ItemResponse = z.infer<typeof itemResponseSchema>;
