import { z } from "zod";

import { clearable, idSchema, text, timestampSchema } from "./common";

// Position on the outfit canvas, relative to its width and height.
const relativeSchema = z.number().min(0).max(1);

// Where one item sits on an outfit's canvas.
export const outfitItemSchema = z
  .object({
    itemId: idSchema,
    x: relativeSchema,
    y: relativeSchema,
    scale: z.number().positive().max(10).default(1),
    zIndex: z.number().int().min(0).max(1000).default(0),
  })
  .strict();

const outfitFields = {
  name: text(120),
  occasion: clearable(text(120)),
};

export const outfitCreateSchema = z.object(outfitFields).strict();

export const outfitUpdateSchema = z
  .object({ ...outfitFields, name: outfitFields.name.optional() })
  .strict();

// Most items one outfit can hold.
export const OUTFIT_ITEMS_MAX = 30;

// Body of POST /api/outfits and PUT /api/outfits/:id: the whole outfit. PUT
// replaces name, occasion and every placement.
export const outfitSaveSchema = z
  .object({
    ...outfitFields,
    items: z
      .array(outfitItemSchema)
      .max(OUTFIT_ITEMS_MAX)
      .refine(
        (items) => new Set(items.map(({ itemId }) => itemId)).size === items.length,
        "Duplicate item",
      ),
  })
  .strict();

export const outfitResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  occasion: z.string().nullable(),
  // Ordered back to front. Name and thumbnail come from the item, so a preview
  // needs no further request.
  items: z.array(
    z.object({
      itemId: idSchema,
      x: relativeSchema,
      y: relativeSchema,
      scale: z.number(),
      zIndex: z.number().int(),
      name: z.string(),
      thumbnailKey: z.string().nullable(),
    }),
  ),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OutfitItemInput = z.infer<typeof outfitItemSchema>;
export type OutfitCreateInput = z.infer<typeof outfitCreateSchema>;
export type OutfitUpdateInput = z.infer<typeof outfitUpdateSchema>;
export type OutfitSaveInput = z.infer<typeof outfitSaveSchema>;
export type OutfitResponse = z.infer<typeof outfitResponseSchema>;
