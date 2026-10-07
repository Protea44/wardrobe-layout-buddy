import { Readable } from "node:stream";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ITEM_PHOTO_MAX_BYTES, itemResponseSchema, type ItemResponse } from "@shared/item";

import type { Storage } from "../lib/storage";
import { newRecordId, storageKey } from "../lib/storage-keys";
import {
  browserHeaders,
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";

// Keeps objects in memory, so tests can look at what was stored.
function createMemoryStorage() {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>();
  const storage: Storage = {
    putObject: (bucket, key, body, contentType) => {
      objects.set(`${bucket}/${key}`, { body, contentType });
      return Promise.resolve();
    },
    getObjectStream: (bucket, key) => {
      const object = objects.get(`${bucket}/${key}`);
      if (!object) return Promise.resolve(null);
      return Promise.resolve({
        stream: Readable.from([Buffer.from(object.body)]),
        contentType: object.contentType,
        contentLength: object.body.byteLength,
      });
    },
    deleteObject: (bucket, key) => {
      objects.delete(`${bucket}/${key}`);
      return Promise.resolve();
    },
    deletePrefix: (bucket, prefix) => {
      for (const key of objects.keys()) {
        if (key.startsWith(`${bucket}/${prefix}`)) objects.delete(key);
      }
      return Promise.resolve();
    },
  };
  return { storage, objects };
}

const ascii = (value: string) => [...value].map((char) => char.charCodeAt(0));

// Only the magic bytes matter to the route; the rest is filler.
function webp(size = 64) {
  const bytes = new Uint8Array(size);
  bytes.set([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBPVP8 ")]);
  return bytes;
}
const jpeg = () => Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, ...ascii("JFIF")]);

type Upload = {
  data?: unknown;
  photo?: Uint8Array;
  thumbnail?: Uint8Array;
  // Content type the client claims; the route must ignore it.
  claimedType?: string;
  extra?: (form: FormData) => void;
};

describe("POST /api/items", () => {
  let app: TestApp;
  let memory: ReturnType<typeof createMemoryStorage>;
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    memory = createMemoryStorage();
    app = await buildTestApp({ storage: memory.storage });
  });
  beforeEach(async () => {
    memory.objects.clear();
    await resetDatabase(app);
    ({ a, b } = await createTwoUsers(app));
  });
  afterAll(() => app.close());

  async function upload(cookie: string | undefined, upload: Upload = {}) {
    const {
      data = { name: "Blau Oberteil", category: "Oberteil", color: "Blau" },
      photo = webp(),
      thumbnail = webp(),
      claimedType = "image/webp",
      extra,
    } = upload;
    const form = new FormData();
    if (data !== null) form.append("data", typeof data === "string" ? data : JSON.stringify(data));
    if (photo.byteLength > 0) {
      form.append("photo", new Blob([photo], { type: claimedType }), "photo.webp");
    }
    if (thumbnail.byteLength > 0) {
      form.append("thumbnail", new Blob([thumbnail], { type: claimedType }), "thumb.webp");
    }
    extra?.(form);

    // Let the Fetch API produce the multipart body and its boundary.
    const encoded = new Request("http://localhost/", { method: "POST", body: form });
    return app.inject({
      method: "POST",
      url: "/api/items",
      headers: {
        ...browserHeaders(app, cookie),
        "content-type": encoded.headers.get("content-type") ?? "",
      },
      payload: Buffer.from(await encoded.arrayBuffer()),
    });
  }

  it("requires a session and stores nothing without one", async () => {
    const response = await upload(undefined);

    expect(response.statusCode).toBe(401);
    expect(memory.objects.size).toBe(0);
  });

  it("creates a private item with photo and thumbnail below the user's prefix", async () => {
    const response = await upload(a.cookie, {
      data: {
        name: "Leinenhemd",
        category: "Oberteil",
        color: "Weiß",
        brand: "Marke",
        price: "49.90",
        purchaseDate: "2026-05-01",
        seasons: ["sommer"],
      },
      photo: webp(),
      thumbnail: jpeg(),
    });

    expect(response.statusCode).toBe(201);
    const item = itemResponseSchema.parse(response.json());
    expect(item).toMatchObject({
      name: "Leinenhemd",
      category: "Oberteil",
      color: "Weiß",
      price: "49.90",
      seasons: ["sommer"],
      visibility: "PRIVATE",
      photoKey: storageKey(a.userId, item.id, "photo.webp"),
      thumbnailKey: storageKey(a.userId, item.id, "thumbnail.jpg"),
    });
    // The stored type comes from the bytes, not from what the client claimed.
    expect(memory.objects.get(`item-photos/${item.photoKey}`)?.contentType).toBe("image/webp");
    expect(memory.objects.get(`item-photos/${item.thumbnailKey}`)?.contentType).toBe("image/jpeg");
    expect(await app.repositories.items.get(a.userId, item.id)).toEqual(item);
  });

  it("serves the stored photos through /api/files to the owner only", async () => {
    const item = (await upload(a.cookie)).json<ItemResponse>();
    const url = `/api/files/item-photos/${item.thumbnailKey}`;

    const own = await app.inject({ method: "GET", url, headers: browserHeaders(app, a.cookie) });
    const foreign = await app.inject({
      method: "GET",
      url,
      headers: browserHeaders(app, b.cookie),
    });

    expect(own.statusCode).toBe(200);
    expect(own.headers["content-type"]).toBe("image/webp");
    expect(foreign.statusCode).toBe(404);
  });

  it("never stores another user's item and keeps it out of their list", async () => {
    const item = (await upload(a.cookie)).json<ItemResponse>();

    expect(await app.repositories.items.get(b.userId, item.id)).toBeNull();
    expect(await app.repositories.items.list(b.userId)).toEqual([]);
  });

  it("answers 404 for another user's receipt and leaves nothing behind", async () => {
    const receiptId = newRecordId();
    await app.repositories.receipts.create(a.userId, {
      id: receiptId,
      fileKey: storageKey(a.userId, receiptId, "beleg.pdf"),
      source: "UPLOAD",
    });

    const response = await upload(b.cookie, {
      data: { name: "Rock", category: "Rock", receiptId },
    });

    expect(response.statusCode).toBe(404);
    expect(memory.objects.size).toBe(0);
    expect(await app.repositories.items.list(b.userId)).toEqual([]);
  });

  it("refuses invalid fields", async () => {
    for (const data of [
      { name: "Hemd", category: "Mäntel" },
      { name: "Hemd", category: "Oberteil", color: "Türkis" },
      { name: "Hemd", category: "Oberteil", visibility: "PUBLIC" },
      { name: "", category: "Oberteil" },
      { name: "Hemd", category: "Oberteil", price: "12,50" },
      "not json",
    ]) {
      const response = await upload(a.cookie, { data });
      expect(response.statusCode, JSON.stringify(data)).toBe(400);
    }
    expect(memory.objects.size).toBe(0);
  });

  it("refuses requests without a thumbnail or with extra parts", async () => {
    const missing = await upload(a.cookie, { thumbnail: new Uint8Array() });
    const extra = await upload(a.cookie, {
      extra: (form) => form.append("visibility", "PUBLIC"),
    });

    expect(missing.statusCode).toBe(400);
    expect(extra.statusCode).toBe(400);
    expect(memory.objects.size).toBe(0);
  });

  it("refuses files that are not really WebP, JPEG or PNG", async () => {
    const disguised = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'/>");

    const response = await upload(a.cookie, { photo: disguised, claimedType: "image/webp" });

    expect(response.statusCode).toBe(415);
    expect(memory.objects.size).toBe(0);
  });

  it("accepts photos above the JSON body limit but refuses more than 10 MB", async () => {
    const large = await upload(a.cookie, { photo: webp(2 * 1024 * 1024) });
    const tooLarge = await upload(a.cookie, { photo: webp(ITEM_PHOTO_MAX_BYTES + 1) });

    expect(large.statusCode).toBe(201);
    expect(tooLarge.statusCode).toBe(413);
    expect(await app.repositories.items.list(a.userId)).toHaveLength(1);
  });

  it("refuses a JSON body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/items",
      headers: browserHeaders(app, a.cookie),
      payload: { name: "Hemd", category: "Oberteil" },
    });

    expect(response.statusCode).toBe(415);
  });
});
