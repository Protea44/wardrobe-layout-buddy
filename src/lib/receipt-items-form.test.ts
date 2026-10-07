import { describe, expect, it } from "vitest";

import { receiptItemsCreateSchema } from "@shared/receipt";

import { formatDate } from "@/lib/format";
import {
  emptyReceiptItem,
  emptyReceiptItemsForm,
  receiptItemsFormSchema,
  toReceiptItemsInput,
} from "@/lib/receipt-items-form";

describe("receipt items form", () => {
  it("requires a category in every block", () => {
    const result = receiptItemsFormSchema.safeParse(emptyReceiptItemsForm);

    expect(result.error?.issues[0]).toMatchObject({
      path: ["items", 0, "category"],
      message: "Bitte wähle eine Kategorie.",
    });
  });

  it("builds a payload the shared schema accepts", () => {
    const values = receiptItemsFormSchema.parse({
      merchant: " Modehaus ",
      purchaseDate: "2026-09-30",
      items: [
        { ...emptyReceiptItem, name: "Leinenhemd", category: "Oberteil", price: "49,90" },
        { ...emptyReceiptItem, category: "Schuhe", size: "41" },
      ],
    });

    const input = toReceiptItemsInput(values);

    expect(input).toEqual({
      merchant: "Modehaus",
      purchaseDate: "2026-09-30",
      items: [
        { name: "Leinenhemd", category: "Oberteil", price: "49.90" },
        { name: "Schuhe", category: "Schuhe", size: "41" },
      ],
    });
    expect(receiptItemsCreateSchema.parse(input)).toEqual(input);
  });
});

describe("formatDate", () => {
  it("formats dates as DD.MM.YYYY", () => {
    expect(formatDate("2026-03-04")).toBe("04.03.2026");
    expect(formatDate("2026-12-31")).toBe("31.12.2026");
    expect(formatDate("2026-10-07T10:00:00.000Z")).toBe("07.10.2026");
  });
});
