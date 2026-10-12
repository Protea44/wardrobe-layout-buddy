import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  forwardingAliasResponseSchema,
  RECEIPT_FILE_MAX_BYTES,
  receiptItemsResponseSchema,
  receiptResponseSchema,
  receiptSummarySchema,
  type ReceiptResponse,
} from "@shared/receipt";

import { storageKey } from "../lib/storage-keys";
import {
  browserHeaders,
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";
import { createMemoryStorage } from "../test/memory-storage";
import { encodeMultipart, fakeJpeg, fakePdf, fakeWebp } from "../test/multipart";

describe("receipt routes", () => {
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

  async function postForm(url: string, cookie: string | undefined, form: FormData) {
    const { contentType, payload } = await encodeMultipart(form);
    return app.inject({
      method: "POST",
      url,
      headers: { ...browserHeaders(app, cookie), "content-type": contentType },
      payload,
    });
  }

  function get(url: string, cookie?: string) {
    return app.inject({ method: "GET", url, headers: browserHeaders(app, cookie) });
  }

  function uploadReceipt(cookie: string | undefined, file: Uint8Array = fakePdf(), type?: string) {
    const form = new FormData();
    form.append("file", new Blob([file], { type: type ?? "application/pdf" }), "rechnung.pdf");
    return postForm("/api/receipts", cookie, form);
  }

  async function createReceipt(user: TestUser) {
    const response = await uploadReceipt(user.cookie);
    expect(response.statusCode).toBe(201);
    return response.json<ReceiptResponse>();
  }

  type ItemsRequest = { data: unknown; files?: Record<string, Uint8Array> };

  function addItems(receiptId: string, cookie: string | undefined, request: ItemsRequest) {
    const form = new FormData();
    form.append("data", JSON.stringify(request.data));
    for (const [name, content] of Object.entries(request.files ?? {})) {
      form.append(name, new Blob([content], { type: "image/webp" }), `${name}.webp`);
    }
    return postForm(`/api/receipts/${receiptId}/items`, cookie, form);
  }

  describe("GET /api/receipts/forwarding-alias", () => {
    it("requires a session", async () => {
      expect((await get("/api/receipts/forwarding-alias")).statusCode).toBe(401);
    });

    it("creates a random alias once and keeps it", async () => {
      const first = forwardingAliasResponseSchema.parse(
        (await get("/api/receipts/forwarding-alias", a.cookie)).json(),
      );
      const again = (await get("/api/receipts/forwarding-alias", a.cookie)).json();
      const other = (await get("/api/receipts/forwarding-alias", b.cookie)).json();

      expect(first.forwardingAlias).toMatch(/^[a-z0-9]{12}$/);
      expect(again).toEqual(first);
      expect(other).not.toEqual(first);
    });
  });

  describe("POST /api/receipts", () => {
    it("requires a session and stores nothing without one", async () => {
      expect((await uploadReceipt(undefined)).statusCode).toBe(401);
      expect(memory.objects.size).toBe(0);
    });

    it("stores the file below the user's prefix as a MANUAL upload", async () => {
      const response = await uploadReceipt(a.cookie, fakePdf(), "image/png");

      expect(response.statusCode).toBe(201);
      const receipt = receiptResponseSchema.parse(response.json());
      expect(receipt).toMatchObject({
        source: "UPLOAD",
        parseStatus: "MANUAL",
        fileKey: storageKey(a.userId, receipt.id, "beleg.pdf"),
      });
      // The stored type comes from the bytes, not from what the client claimed.
      expect(memory.objects.get(`receipts/${receipt.fileKey}`)?.contentType).toBe(
        "application/pdf",
      );
    });

    it("accepts JPEG and refuses WebP and disguised files", async () => {
      expect((await uploadReceipt(a.cookie, fakeJpeg(), "image/jpeg")).statusCode).toBe(201);
      expect((await uploadReceipt(a.cookie, fakeWebp(), "image/webp")).statusCode).toBe(415);
      const html = new TextEncoder().encode("<html><script>alert(1)</script>");
      expect((await uploadReceipt(a.cookie, html, "application/pdf")).statusCode).toBe(415);
      expect(memory.objects.size).toBe(1);
    });

    it("refuses files above 10 MB", async () => {
      const response = await uploadReceipt(a.cookie, fakePdf(RECEIPT_FILE_MAX_BYTES + 1));

      expect(response.statusCode).toBe(413);
      expect(memory.objects.size).toBe(0);
    });

    it("refuses a request without a file or with extra parts", async () => {
      const empty = new FormData();
      empty.append("data", "{}");
      const extra = new FormData();
      extra.append("file", new Blob([fakePdf()]), "a.pdf");
      extra.append("other", new Blob([fakePdf()]), "b.pdf");

      expect((await postForm("/api/receipts", a.cookie, empty)).statusCode).toBe(400);
      expect((await postForm("/api/receipts", a.cookie, extra)).statusCode).toBe(400);
    });
  });

  describe("POST /api/receipts/:id/items", () => {
    const data = {
      merchant: "Modehaus Beispiel",
      purchaseDate: "2026-09-30",
      items: [
        { name: "Leinenhemd", category: "Oberteil", brand: "Marke", size: "M", price: "49.90" },
        { name: "Chino", category: "Hose" },
      ],
    };

    it("requires a session", async () => {
      const receipt = await createReceipt(a);
      expect((await addItems(receipt.id, undefined, { data })).statusCode).toBe(401);
    });

    it("creates one private item per block, linked to the receipt", async () => {
      const receipt = await createReceipt(a);

      const response = await addItems(receipt.id, a.cookie, {
        data,
        files: { "photo-1": fakeWebp(), "thumbnail-1": fakeWebp() },
      });

      expect(response.statusCode).toBe(201);
      const { items } = receiptItemsResponseSchema.parse(response.json());
      expect(items).toHaveLength(2);
      for (const item of items) {
        expect(item).toMatchObject({
          receiptId: receipt.id,
          visibility: "PRIVATE",
          retailer: "Modehaus Beispiel",
          purchaseDate: "2026-09-30",
        });
      }
      expect(items[0]).toMatchObject({ name: "Leinenhemd", price: "49.90", photoKey: null });
      const chino = items[1];
      expect(chino?.photoKey).toBe(storageKey(a.userId, chino?.id ?? "", "photo.webp"));
      expect(memory.objects.has(`item-photos/${chino?.thumbnailKey}`)).toBe(true);

      const stored = await app.repositories.receipts.get(a.userId, receipt.id);
      expect(stored).toMatchObject({
        merchant: "Modehaus Beispiel",
        purchaseDate: "2026-09-30",
        parseStatus: "MANUAL",
      });
    });

    it("answers 404 for another user's receipt and stores nothing", async () => {
      const receipt = await createReceipt(a);
      memory.objects.clear();

      const response = await addItems(receipt.id, b.cookie, {
        data,
        files: { "photo-0": fakeWebp(), "thumbnail-0": fakeWebp() },
      });

      expect(response.statusCode).toBe(404);
      expect(memory.objects.size).toBe(0);
      expect(await app.repositories.items.list(b.userId)).toEqual([]);
      expect(await app.repositories.items.list(a.userId)).toEqual([]);
    });

    it("answers 404 for an unknown receipt", async () => {
      const response = await addItems("00000000-0000-0000-0000-000000000000", a.cookie, { data });
      expect(response.statusCode).toBe(404);
    });

    it("creates nothing when one block is invalid", async () => {
      const receipt = await createReceipt(a);

      for (const invalid of [
        { ...data, items: [...data.items, { name: "Mütze", category: "Hüte" }] },
        { ...data, items: [] },
        { ...data, items: [{ name: "Hemd", category: "Oberteil", visibility: "PUBLIC" }] },
      ]) {
        const response = await addItems(receipt.id, a.cookie, { data: invalid });
        expect(response.statusCode, JSON.stringify(invalid)).toBe(400);
      }
      expect(await app.repositories.items.list(a.userId)).toEqual([]);
    });

    it("refuses half photo pairs, photos without an item and non-images", async () => {
      const receipt = await createReceipt(a);
      memory.objects.clear();

      const half = await addItems(receipt.id, a.cookie, {
        data,
        files: { "photo-0": fakeWebp() },
      });
      const orphan = await addItems(receipt.id, a.cookie, {
        data,
        files: { "photo-5": fakeWebp(), "thumbnail-5": fakeWebp() },
      });
      const notImage = await addItems(receipt.id, a.cookie, {
        data,
        files: { "photo-0": fakePdf(), "thumbnail-0": fakeWebp() },
      });

      expect(half.statusCode).toBe(400);
      expect(orphan.statusCode).toBe(400);
      expect(notImage.statusCode).toBe(415);
      expect(memory.objects.size).toBe(0);
      expect(await app.repositories.items.list(a.userId)).toEqual([]);
    });
  });

  describe("GET /api/receipts", () => {
    it("requires a session", async () => {
      expect((await get("/api/receipts")).statusCode).toBe(401);
    });

    it("lists only the user's receipts with their item count", async () => {
      const withItems = await createReceipt(a);
      const empty = await createReceipt(a);
      await createReceipt(b);
      await addItems(withItems.id, a.cookie, {
        data: {
          items: [
            { name: "Rock", category: "Rock" },
            { name: "Kleid", category: "Kleid" },
          ],
        },
      });

      const response = await get("/api/receipts", a.cookie);

      expect(response.statusCode).toBe(200);
      const list = receiptSummarySchema.array().parse(response.json());
      expect(list.map(({ id, itemCount }) => ({ id, itemCount }))).toEqual(
        expect.arrayContaining([
          { id: withItems.id, itemCount: 2 },
          { id: empty.id, itemCount: 0 },
        ]),
      );
      expect(list).toHaveLength(2);
    });
  });

  describe("viewing a receipt through /api/files", () => {
    it("shows the owner's PDF inline and hides it from others", async () => {
      const receipt = await createReceipt(a);
      const url = `/api/files/receipts/${receipt.fileKey}`;

      const own = await get(url, a.cookie);
      const foreign = await get(url, b.cookie);

      expect(own.statusCode).toBe(200);
      expect(own.headers["content-type"]).toBe("application/pdf");
      expect(own.headers["content-disposition"]).toBe('inline; filename="beleg.pdf"');
      expect(own.headers["content-security-policy"]).toBe("default-src 'none'");
      expect(foreign.statusCode).toBe(404);
    });
  });
});
