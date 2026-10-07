import { z } from "zod";

import { clearable, dateOnlySchema, idSchema, text, timestampSchema } from "./common";

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

export type ReceiptSource = z.infer<typeof receiptSourceSchema>;
export type ParseStatus = z.infer<typeof parseStatusSchema>;
export type ReceiptCreateInput = z.infer<typeof receiptCreateSchema>;
export type ReceiptUpdateInput = z.infer<typeof receiptUpdateSchema>;
export type ReceiptResponse = z.infer<typeof receiptResponseSchema>;
