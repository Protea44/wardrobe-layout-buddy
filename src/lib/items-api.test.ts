import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api";
import { itemPhotoUrl, uploadItem } from "@/lib/items-api";

const item = {
  id: "item-1",
  name: "Blau Oberteil",
  category: "Oberteil",
  color: "Blau",
  brand: null,
  size: null,
  price: null,
  currency: "EUR",
  purchaseDate: null,
  material: null,
  retailer: null,
  productUrl: null,
  seasons: [],
  notes: null,
  photoKey: "user-1/item-1/photo.webp",
  thumbnailKey: "user-1/item-1/thumbnail.webp",
  receiptId: null,
  visibility: "PRIVATE",
  isForSale: false,
  isTradeable: false,
  isLinkable: false,
  lifecycleStatus: "ACTIVE",
  createdAt: "2026-10-07T12:00:00.000Z",
  updatedAt: "2026-10-07T12:00:00.000Z",
};

// Answers every request with the given status and body, reporting upload progress first.
function mockXhr(status: number | "network-error", body = "") {
  const sent: { url?: string; body?: unknown; withCredentials?: boolean } = {};

  class FakeXhr extends EventTarget {
    upload = new EventTarget();
    status = 0;
    responseText = "";
    withCredentials = false;
    open(_method: string, url: string) {
      sent.url = url;
    }
    setRequestHeader() {}
    send(payload: unknown) {
      sent.body = payload;
      sent.withCredentials = this.withCredentials;
      const progress = new ProgressEvent("progress", {
        lengthComputable: true,
        loaded: 50,
        total: 100,
      });
      this.upload.dispatchEvent(progress);
      if (status === "network-error") {
        this.dispatchEvent(new Event("error"));
        return;
      }
      this.status = status;
      this.responseText = body;
      this.dispatchEvent(new Event("load"));
    }
  }
  vi.stubGlobal("XMLHttpRequest", FakeXhr);
  return sent;
}

const input = {
  photo: new Blob(["photo"], { type: "image/webp" }),
  thumbnail: new Blob(["thumb"], { type: "image/jpeg" }),
  fields: { name: "Blau Oberteil", category: "Oberteil" as const, color: "Blau" as const },
};

describe("uploadItem", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends photo, thumbnail and fields as multipart with credentials", async () => {
    const sent = mockXhr(201, JSON.stringify(item));
    const onProgress = vi.fn();

    const result = await uploadItem(input, { onProgress });

    expect(result).toEqual(item);
    expect(sent.url).toBe("/api/items");
    expect(sent.withCredentials).toBe(true);
    expect(onProgress).toHaveBeenCalledWith(0.5);
    const form = sent.body as FormData;
    expect(JSON.parse(form.get("data") as string)).toEqual(input.fields);
    expect((form.get("photo") as File).name).toBe("photo.webp");
    expect((form.get("thumbnail") as File).name).toBe("thumbnail.jpg");
  });

  it("reports server errors in German", async () => {
    mockXhr(415, JSON.stringify({ statusCode: 415, error: "Unsupported Media Type", message: "" }));

    const error = await uploadItem(input).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 415, code: "Unsupported Media Type" });
    expect((error as ApiError).message).toMatch(/JPEG, PNG und WebP/);
  });

  it("reports a network failure in German", async () => {
    mockXhr("network-error");

    const error = await uploadItem(input).catch((caught: unknown) => caught);

    expect(error).toMatchObject({ status: null, message: expect.stringMatching(/Verbindung/) });
  });
});

describe("itemPhotoUrl", () => {
  it("points to the authenticated files route", () => {
    expect(itemPhotoUrl("user-1/item-1/photo.webp")).toBe(
      "/api/files/item-photos/user-1/item-1/photo.webp",
    );
  });
});
