import { z } from "zod";

import type { OutfitSaveInput } from "@shared/outfit";

import { optionalText } from "@/lib/item-form";
import { toPlacements, type CanvasItem } from "@/lib/outfit-canvas";

export const outfitFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bitte gib deinem Outfit einen Namen.")
    .max(120, "Der Name darf höchstens 120 Zeichen lang sein."),
  occasion: optionalText("Der Anlass", 120),
});

export type OutfitFormValues = z.infer<typeof outfitFormSchema>;

export function toOutfitSaveInput(values: OutfitFormValues, items: CanvasItem[]): OutfitSaveInput {
  return {
    name: values.name,
    occasion: values.occasion === "" ? null : values.occasion,
    items: toPlacements(items),
  };
}
