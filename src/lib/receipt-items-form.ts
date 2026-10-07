import { z } from "zod";

import type { ReceiptItemsCreateInput } from "@shared/receipt";

import {
  categoryField,
  dateField,
  normalizePrice,
  optionalText,
  priceField,
} from "@/lib/item-form";

export const receiptItemFormSchema = z.object({
  name: optionalText("Der Name", 120),
  category: categoryField,
  brand: optionalText("Die Marke", 80),
  size: optionalText("Die Größe", 40),
  price: priceField,
});

// What the "Beleg" form holds after the upload: every input is a string,
// empty means "not set".
export const receiptItemsFormSchema = z.object({
  merchant: optionalText("Der Händler", 120),
  purchaseDate: dateField,
  items: z.array(receiptItemFormSchema).min(1, "Füge mindestens ein Teil hinzu."),
});

export type ReceiptItemsFormInput = z.input<typeof receiptItemsFormSchema>;
export type ReceiptItemsFormValues = z.output<typeof receiptItemsFormSchema>;

export const emptyReceiptItem: ReceiptItemsFormInput["items"][number] = {
  name: "",
  category: "",
  brand: "",
  size: "",
  price: "",
};

export const emptyReceiptItemsForm: ReceiptItemsFormInput = {
  merchant: "",
  purchaseDate: "",
  items: [emptyReceiptItem],
};

// Leaves out empty fields; an item without a name is named after its category.
export function toReceiptItemsInput(values: ReceiptItemsFormValues): ReceiptItemsCreateInput {
  return {
    ...(values.merchant !== "" && { merchant: values.merchant }),
    ...(values.purchaseDate !== "" && { purchaseDate: values.purchaseDate }),
    items: values.items.map((item) => {
      const price = item.price === "" ? null : normalizePrice(item.price);
      return {
        name: item.name || item.category,
        category: item.category,
        ...(item.brand !== "" && { brand: item.brand }),
        ...(item.size !== "" && { size: item.size }),
        ...(price !== null && { price }),
      };
    }),
  };
}
