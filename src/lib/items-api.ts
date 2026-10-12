import {
  itemFacetsSchema,
  itemListResponseSchema,
  itemResponseSchema,
  type ItemEditInput,
  type ItemResponse,
  type ItemUploadInput,
} from "@shared/item";

import { api, API_BASE } from "@/lib/api";
import { photoFilename, postMultipart, type UploadOptions } from "@/lib/upload";
import { itemListQuery, type WardrobeSearch } from "@/lib/wardrobe-search";

export const itemQueryKeys = {
  all: ["items"] as const,
  list: (search: WardrobeSearch) => ["items", "list", search] as const,
  facets: ["items", "facets"] as const,
  detail: (id: string) => ["items", "detail", id] as const,
};

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

export function fetchItems(search: WardrobeSearch, cursor: string | null) {
  return api(`/items${itemListQuery(search, cursor)}`, { schema: itemListResponseSchema });
}

export function fetchItemFacets() {
  return api("/items/facets", { schema: itemFacetsSchema });
}

export function fetchItem(id: string) {
  return api(`/items/${encodeURIComponent(id)}`, { schema: itemResponseSchema });
}

export function updateItem(id: string, input: ItemEditInput) {
  return api(`/items/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
    schema: itemResponseSchema,
  });
}

export async function deleteItem(id: string) {
  await api(`/items/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// PUT /api/items/:id/photo with a new photo and thumbnail.
export function replaceItemPhoto(
  id: string,
  input: { photo: Blob; thumbnail: Blob },
  options: UploadOptions = {},
): Promise<ItemResponse> {
  const form = new FormData();
  form.append("photo", input.photo, photoFilename("photo", input.photo));
  form.append("thumbnail", input.thumbnail, photoFilename("thumbnail", input.thumbnail));
  return postMultipart(`/items/${encodeURIComponent(id)}/photo`, form, itemResponseSchema, {
    ...options,
    method: "PUT",
  });
}
