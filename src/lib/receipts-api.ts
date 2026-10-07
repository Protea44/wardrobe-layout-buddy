import {
  forwardingAliasResponseSchema,
  receiptItemsResponseSchema,
  receiptResponseSchema,
  receiptSummarySchema,
  type ReceiptItemsCreateInput,
  type ReceiptItemsResponse,
  type ReceiptResponse,
} from "@shared/receipt";

import { api, API_BASE } from "@/lib/api";
import { photoFilename, postMultipart, type UploadOptions } from "@/lib/upload";

export const receiptQueryKeys = {
  list: ["receipts"] as const,
  forwardingAlias: ["receipts", "forwarding-alias"] as const,
};

// Opens through the authenticated files route, inline in the browser.
export function receiptFileUrl(fileKey: string) {
  return `${API_BASE}/files/receipts/${fileKey.split("/").map(encodeURIComponent).join("/")}`;
}

export async function fetchForwardingAlias() {
  const { forwardingAlias } = await api("/receipts/forwarding-alias", {
    schema: forwardingAliasResponseSchema,
  });
  return forwardingAlias;
}

export function fetchReceipts() {
  return api("/receipts", { schema: receiptSummarySchema.array() });
}

export function uploadReceipt(file: Blob, options: UploadOptions = {}): Promise<ReceiptResponse> {
  const extension =
    file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const form = new FormData();
  form.append("file", file, `beleg.${extension}`);
  return postMultipart("/receipts", form, receiptResponseSchema, options);
}

export type ReceiptItemPhoto = { photo: Blob; thumbnail: Blob };

// One item per entry of input.items; photos[i] belongs to input.items[i].
export function createReceiptItems(
  receiptId: string,
  input: ReceiptItemsCreateInput,
  photos: (ReceiptItemPhoto | null)[],
  options: UploadOptions = {},
): Promise<ReceiptItemsResponse> {
  const form = new FormData();
  form.append("data", JSON.stringify(input));
  photos.forEach((entry, index) => {
    if (entry === null) return;
    form.append(`photo-${index}`, entry.photo, photoFilename("photo", entry.photo));
    form.append(`thumbnail-${index}`, entry.thumbnail, photoFilename("thumbnail", entry.thumbnail));
  });
  return postMultipart(
    `/receipts/${encodeURIComponent(receiptId)}/items`,
    form,
    receiptItemsResponseSchema,
    options,
  );
}
