import { describe, expect, it } from "vitest";

import { itemUploadSchema } from "@shared/item";

import {
  defaultItemName,
  emptyItemForm,
  itemFormSchema,
  normalizePrice,
  toItemUploadInput,
} from "@/lib/item-form";

describe("normalizePrice", () => {
  it.each([
    ["49,90", "49.90"],
    ["1.234,56", "1234.56"],
    ["49.9", "49.9"],
    ["12 €", "12"],
  ])("reads %s as %s", (input, expected) => {
    expect(normalizePrice(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "1,234", "12,3,4"])("refuses %j", (input) => {
    expect(normalizePrice(input)).toBeNull();
  });
});

describe("item form", () => {
  it("requires a category with a German message", () => {
    const result = itemFormSchema.safeParse(emptyItemForm);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ["category"],
      message: "Bitte wähle eine Kategorie.",
    });
  });

  it("explains an invalid price in German", () => {
    const result = itemFormSchema.safeParse({ ...emptyItemForm, category: "Hose", price: "zehn" });

    expect(result.error?.issues[0]?.message).toBe(
      "Bitte gib einen gültigen Preis ein, z. B. 49,90.",
    );
  });

  it("names the item after color and category when the name is empty", () => {
    expect(defaultItemName("Blau", "Oberteil")).toBe("Blau Oberteil");
    expect(defaultItemName("", "Rock")).toBe("Rock");

    const values = itemFormSchema.parse({ ...emptyItemForm, category: "Kleid", color: "Rot" });
    expect(toItemUploadInput(values)).toEqual({
      name: "Rot Kleid",
      category: "Kleid",
      color: "Rot",
    });
  });

  it("builds an upload payload the shared schema accepts, without empty fields", () => {
    const values = itemFormSchema.parse({
      ...emptyItemForm,
      category: "Jacke & Mantel",
      color: "Navy",
      name: "  Wollmantel ",
      price: "189,90",
      purchaseDate: "2026-02-28",
      seasons: ["herbst", "winter"],
    });

    const input = toItemUploadInput(values);

    expect(input).toEqual({
      name: "Wollmantel",
      category: "Jacke & Mantel",
      color: "Navy",
      price: "189.90",
      purchaseDate: "2026-02-28",
      seasons: ["herbst", "winter"],
    });
    expect(itemUploadSchema.parse(input)).toEqual(input);
  });
});
