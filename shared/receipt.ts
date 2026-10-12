import { z } from "zod";

import { clearable, dateOnlySchema, idSchema, text, timestampSchema } from "./common";
import { itemCategorySchema, itemResponseSchema, priceSchema } from "./item";

export const receiptSourceSchema = z.enum(["UPLOAD", "EMAIL"]);
export const parseStatusSchema = z.enum(["PENDING", "PARSED", "FAILED", "MANUAL"]);

// Details a user can add to a receipt. The file itself arrives through the
// upload, which also sets the file key and the source.
const receiptFields = {
  merchant: clearable(text(120)),
  purchaseDate: clearable(dateOnlySchema),
};

export const receiptCreateSchema = z.object(receiptFields).strict();

export const receiptUpdateSchema = z.object(receiptFields).strict();

export const receiptResponseSchema = z.object({
  id: idSchema,
  fileKey: z.string(),
  source: receiptSourceSchema,
  merchant: z.string().nullable(),
  purchaseDate: dateOnlySchema.nullable(),
  receivedAt: timestampSchema,
  parseStatus: parseStatusSchema,
  createdAt: timestampSchema,
});

// Largest receipt file POST /api/receipts accepts (PDF, JPEG or PNG).
export const RECEIPT_FILE_MAX_BYTES = 10 * 1024 * 1024;

// GET /api/receipts: a receipt with the number of items linked to it.
export const receiptSummarySchema = receiptResponseSchema.extend({
  itemCount: z.number().int().nonnegative(),
});

// GET /api/receipts/forwarding-alias. The domain is configured separately.
export const forwardingAliasResponseSchema = z.object({
  forwardingAlias: z.string().regex(/^[a-z0-9]{6,32}$/),
});

// Most items one request may create from a receipt.
export const RECEIPT_ITEMS_MAX = 20;

// One "Teil aus diesem Beleg" block.
export const receiptItemSchema = z
  .object({
    name: text(120),
    category: itemCategorySchema,
    brand: clearable(text(80)),
    size: clearable(text(40)),
    price: clearable(priceSchema),
  })
  .strict();

// The "data" part (JSON) of POST /api/receipts/:id/items. Item i may come with
// the files "photo-i" and "thumbnail-i". Merchant and date are stored on the
// receipt and copied to every item.
export const receiptItemsCreateSchema = z
  .object({
    ...receiptFields,
    items: z.array(receiptItemSchema).min(1).max(RECEIPT_ITEMS_MAX),
  })
  .strict();

export const receiptItemsResponseSchema = z.object({
  items: z.array(itemResponseSchema),
});

export type ReceiptSource = z.infer<typeof receiptSourceSchema>;
export type ParseStatus = z.infer<typeof parseStatusSchema>;
export type ReceiptCreateInput = z.infer<typeof receiptCreateSchema>;
export type ReceiptUpdateInput = z.infer<typeof receiptUpdateSchema>;
export type ReceiptResponse = z.infer<typeof receiptResponseSchema>;
export type ReceiptSummary = z.infer<typeof receiptSummarySchema>;
export type ForwardingAliasResponse = z.infer<typeof forwardingAliasResponseSchema>;
export type ReceiptItemInput = z.infer<typeof receiptItemSchema>;
export type ReceiptItemsCreateInput = z.infer<typeof receiptItemsCreateSchema>;
export type ReceiptItemsResponse = z.infer<typeof receiptItemsResponseSchema>;
