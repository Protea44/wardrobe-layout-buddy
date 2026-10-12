import { describe, expect, it } from "vitest";

import { itemEditSchema, itemUploadSchema } from "@shared/item";

import {
  defaultItemName,
  emptyItemForm,
  itemFormSchema,
  itemToFormInput,
  normalizePrice,
  toItemEditInput,
  toItemUploadInput,
} from "@/lib/item-form";
import { itemFixture } from "@/test/fixtures";

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

describe("editing an item", () => {
  it("fills the form from the item, with a comma in the price", () => {
    expect(itemToFormInput(itemFixture())).toEqual({
      category: "Oberteil",
      color: "Weiß",
      name: "Leinenhemd",
      brand: "Marke",
      size: "M",
      price: "49,90",
      purchaseDate: "2026-05-01",
      material: "Leinen",
      retailer: "Modehaus",
      seasons: ["sommer"],
      notes: "Bügeln",
    });
  });

  it("sends every field and clears the emptied ones", () => {
    const values = itemFormSchema.parse({
      ...itemToFormInput(itemFixture()),
      name: "",
      brand: "",
      price: "39,50",
      notes: "",
      seasons: [],
    });

    const input = toItemEditInput(values);

    expect(input).toEqual({
      name: "Weiß Oberteil",
      category: "Oberteil",
      color: "Weiß",
      brand: null,
      size: "M",
      price: "39.50",
      purchaseDate: "2026-05-01",
      material: "Leinen",
      retailer: "Modehaus",
      seasons: [],
      notes: null,
    });
    expect(itemEditSchema.parse(input)).toEqual(input);
  });
});
