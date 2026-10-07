import { describe, expect, it } from "vitest";

import { outfitSaveSchema } from "@shared/outfit";

import { addItem } from "@/lib/outfit-canvas";
import { outfitFormSchema, toOutfitSaveInput } from "@/lib/outfit-form";

describe("outfit form", () => {
  it("requires a name with a German message", () => {
    expect(outfitFormSchema.safeParse({ name: " ", occasion: "" }).error?.issues[0]?.message).toBe(
      "Bitte gib deinem Outfit einen Namen.",
    );
  });

  it("builds a payload the shared schema accepts", () => {
    const items = addItem([], { itemId: "a", name: "Hemd", thumbnailKey: null });
    const input = toOutfitSaveInput(outfitFormSchema.parse({ name: "Büro", occasion: "" }), items);

    expect(input).toEqual({
      name: "Büro",
      occasion: null,
      items: [{ itemId: "a", x: 0.38, y: 0.38, scale: 1, zIndex: 0 }],
    });
    expect(outfitSaveSchema.parse(input)).toEqual(input);
  });
});
