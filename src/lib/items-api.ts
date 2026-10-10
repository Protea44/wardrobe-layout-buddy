import { itemResponseSchema, type ItemResponse, type ItemUploadInput } from "@shared/item";

import {
  API_BASE,
  ApiError,
  errorForStatus,
  NETWORK_ERROR_MESSAGE,
  UNEXPECTED_RESPONSE_MESSAGE,
} from "@/lib/api";

// Photos are only reachable through the authenticated files route.
export function itemPhotoUrl(key: string) {
  return `${API_BASE}/files/item-photos/${key.split("/").map(encodeURIComponent).join("/")}`;
}

function extension(blob: Blob) {
  return blob.type === "image/jpeg" ? "jpg" : "webp";
}

type UploadItemOptions = {
  // Called with the uploaded share of the request, from 0 to 1.
  onProgress?: (fraction: number) => void;
};

// POST /api/items as multipart/form-data. Uses XMLHttpRequest because fetch
// cannot report upload progress.
export function uploadItem(
  input: { photo: Blob; thumbnail: Blob; fields: ItemUploadInput },
  { onProgress }: UploadItemOptions = {},
): Promise<ItemResponse> {
  const form = new FormData();
  form.append("data", JSON.stringify(input.fields));
  form.append("photo", input.photo, `photo.${extension(input.photo)}`);
  form.append("thumbnail", input.thumbnail, `thumbnail.${extension(input.thumbnail)}`);

  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/items`);
    request.withCredentials = true;
    request.setRequestHeader("Accept", "application/json");

    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    });
    request.addEventListener("error", () => reject(new ApiError(NETWORK_ERROR_MESSAGE, null)));
    request.addEventListener("load", () => {
      let data: unknown;
      try {
        data =
          request.responseText === "" ? undefined : (JSON.parse(request.responseText) as unknown);
      } catch {
        data = undefined;
      }

      if (request.status < 200 || request.status >= 300) {
        reject(errorForStatus(request.status, data));
        return;
      }
      const parsed = itemResponseSchema.safeParse(data);
      if (parsed.success) resolve(parsed.data);
      else reject(new ApiError(UNEXPECTED_RESPONSE_MESSAGE, request.status));
    });

    request.send(form);
  });
}
