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

export const outfitResponseSchema = z.object({
  id: idSchema,
  name: z.string(),
  occasion: z.string().nullable(),
  items: z.array(
    z.object({
      itemId: idSchema,
      x: relativeSchema,
      y: relativeSchema,
      scale: z.number(),
      zIndex: z.number().int(),
    }),
  ),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export type OutfitItemInput = z.infer<typeof outfitItemSchema>;
export type OutfitCreateInput = z.infer<typeof outfitCreateSchema>;
export type OutfitUpdateInput = z.infer<typeof outfitUpdateSchema>;
export type OutfitResponse = z.infer<typeof outfitResponseSchema>;
