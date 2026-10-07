import type { ZodType } from "zod";

import {
  API_BASE,
  ApiError,
  errorForStatus,
  NETWORK_ERROR_MESSAGE,
  UNEXPECTED_RESPONSE_MESSAGE,
} from "@/lib/api";

export type UploadOptions = {
  // Called with the uploaded share of the request, from 0 to 1.
  onProgress?: (fraction: number) => void;
};

type SendOptions = UploadOptions & { method?: "POST" | "PUT" };

// Sends multipart/form-data (POST unless stated) and validates the JSON answer. Uses XMLHttpRequest
// because fetch cannot report upload progress. Errors are ApiErrors in German.
export function postMultipart<T>(
  path: string,
  form: FormData,
  schema: ZodType<T>,
  { onProgress, method = "POST" }: SendOptions = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(method, `${API_BASE}${path}`);
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
      const parsed = schema.safeParse(data);
      if (parsed.success) resolve(parsed.data);
      else reject(new ApiError(UNEXPECTED_RESPONSE_MESSAGE, request.status));
    });

    request.send(form);
  });
}

// File name for an encoded photo, matching its type.
export function photoFilename(base: string, blob: Blob) {
  return `${base}.${blob.type === "image/jpeg" ? "jpg" : "webp"}`;
}
