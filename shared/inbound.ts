import { z } from "zod";

// Standard base64; mail providers may wrap it in lines.
const base64Schema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .refine((value) => /^[A-Za-z0-9+/]*={0,2}$/.test(value), "Invalid base64");

// Body of POST /api/inbound/receipt, sent by the mail provider for every
// e-mail to a forwarding address.
export const inboundReceiptSchema = z.object({
  to: z.string().min(1).max(2000),
  from: z.string().max(2000),
  subject: z.string().max(2000),
  html: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string().max(255),
        contentType: z.string().max(255),
        base64: base64Schema,
      }),
    )
    .max(20)
    .default([]),
});

export type InboundReceipt = z.infer<typeof inboundReceiptSchema>;
