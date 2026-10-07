import { itemResponseSchema, type ItemResponse, type ItemUploadInput } from "@shared/item";

import { API_BASE } from "@/lib/api";
import { photoFilename, postMultipart, type UploadOptions } from "@/lib/upload";

// Photos are only reachable through the authenticated files route.
export function itemPhotoUrl(key: string) {
  return `${API_BASE}/files/item-photos/${key.split("/").map(encodeURIComponent).join("/")}`;
}

// POST /api/items with photo, thumbnail and the fields as JSON.
export function uploadItem(
  input: { photo: Blob; thumbnail: Blob; fields: ItemUploadInput },
  options: UploadOptions = {},
): Promise<ItemResponse> {
  const form = new FormData();
  form.append("data", JSON.stringify(input.fields));
  form.append("photo", input.photo, photoFilename("photo", input.photo));
  form.append("thumbnail", input.thumbnail, photoFilename("thumbnail", input.thumbnail));
  return postMultipart("/items", form, itemResponseSchema, options);
}
