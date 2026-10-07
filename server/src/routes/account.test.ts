import { strFromU8, unzipSync } from "fflate";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { accountResponseSchema } from "@shared/account";

import { newRecordId, storageKey } from "../lib/storage-keys";
import {
  browserHeaders,
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  TEST_PASSWORD,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";
import { createMemoryStorage } from "../test/memory-storage";
import { fakePdf, fakeWebp } from "../test/multipart";

describe("account routes", () => {
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

  // An item with a photo, a receipt and an outfit, like a real wardrobe.
  async function fillWardrobe(user: TestUser, name = 'Leinenhemd; "weiß"') {
    const receiptId = newRecordId();
    const fileKey = storageKey(user.userId, receiptId, "beleg.pdf");
    await memory.storage.putObject("receipts", fileKey, fakePdf(), "application/pdf");
    await app.repositories.receipts.create(user.userId, {
      id: receiptId,
      fileKey,
      source: "UPLOAD",
      merchant: "Modehaus",
    });

    const itemId = newRecordId();
    await app.repositories.items.create(
      user.userId,
      {
        name,
        category: "Oberteil",
        price: "1234.5",
        purchaseDate: "2026-03-14",
        seasons: ["sommer"],
        notes: '=HYPERLINK("x")',
        receiptId,
      },
      itemId,
    );
    const photoKey = storageKey(user.userId, itemId, "photo.webp");
    const thumbnailKey = storageKey(user.userId, itemId, "thumbnail.webp");
    await memory.storage.putObject("item-photos", photoKey, fakeWebp(), "image/webp");
    await memory.storage.putObject("item-photos", thumbnailKey, fakeWebp(), "image/webp");
    await app.repositories.items.setPhoto(user.userId, itemId, { photoKey, thumbnailKey });

    const outfit = await app.repositories.outfits.create(user.userId, { name: "Büro" });
    await app.repositories.outfits.setItem(user.userId, outfit.id, {
      itemId,
      x: 0.5,
      y: 0.5,
      scale: 1,
      zIndex: 0,
    });
    return { itemId, receiptId, outfitId: outfit.id };
  }

  function request(method: "GET" | "DELETE", url: string, cookie?: string, payload?: unknown) {
    return app.inject({
      method,
      url,
      headers: browserHeaders(app, cookie),
      ...(payload !== undefined && { payload: payload as Record<string, unknown> }),
    });
  }

  describe("GET /api/account", () => {
    it("returns the own profile and requires a session", async () => {
      const response = await request("GET", "/api/account", a.cookie);

      expect(response.statusCode).toBe(200);
      expect(accountResponseSchema.parse(response.json())).toMatchObject({
        name: "Test Person",
        email: "user-a@example.test",
        hasPassword: true,
      });
      expect((await request("GET", "/api/account")).statusCode).toBe(401);
    });
  });

  describe("GET /api/account/export", () => {
    it("requires a session", async () => {
      expect((await request("GET", "/api/account/export")).statusCode).toBe(401);
    });

    it("sends a ZIP with data, CSV, photos and receipts of the user only", async () => {
      const own = await fillWardrobe(a);
      await fillWardrobe(b, "Fremdes Teil");

      const response = await request("GET", "/api/account/export", a.cookie);

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toBe("application/zip");
      expect(response.headers["content-disposition"]).toMatch(
        /^attachment; filename="kleiderschrank-kompakt-export-\d{4}-\d{2}-\d{2}\.zip"$/,
      );
      const files = unzipSync(new Uint8Array(response.rawPayload));
      expect(Object.keys(files).sort()).toEqual([
        `belege/${own.receiptId}-beleg.pdf`,
        "daten.json",
        `fotos/${own.itemId}.webp`,
        "kleidung.csv",
      ]);

      const data = JSON.parse(strFromU8(files["daten.json"] ?? new Uint8Array())) as {
        profile: { email: string };
        items: { id: string }[];
        receipts: { id: string; merchant: string }[];
        outfits: { name: string; items: { itemId: string }[] }[];
      };
      expect(data.profile.email).toBe("user-a@example.test");
      expect(data.items.map(({ id }) => id)).toEqual([own.itemId]);
      expect(data.receipts).toMatchObject([{ id: own.receiptId, merchant: "Modehaus" }]);
      expect(data.outfits).toMatchObject([{ name: "Büro", items: [{ itemId: own.itemId }] }]);

      const csv = files["kleidung.csv"] ?? new Uint8Array();
      expect([...csv.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
      const [header, row] = strFromU8(csv).slice(1).split("\r\n");
      expect(header?.split(";").slice(0, 3)).toEqual(["ID", "Name", "Kategorie"]);
      expect(row).toContain('"Leinenhemd; ""weiß"""');
      expect(row).toContain(";1234,50;14.03.2026;");
      expect(row).toContain(";Sommer;");
      // Notes that look like a formula never run in Excel.
      expect(row).toContain(`"'=HYPERLINK(""x"")"`);
      expect(strFromU8(csv)).not.toContain("Fremdes Teil");
    });

    it("has a strict rate limit", async () => {
      const limited = await buildTestApp({
        storage: memory.storage,
        config: { EXPORT_RATE_LIMIT_MAX: 1 },
      });
      try {
        // Same database and secret: the session of user a is valid here too.
        const exportOnce = () =>
          limited.inject({
            method: "GET",
            url: "/api/account/export",
            headers: browserHeaders(limited, a.cookie),
          });
        expect((await exportOnce()).statusCode).toBe(200);
        expect((await exportOnce()).statusCode).toBe(429);
      } finally {
        await limited.close();
      }
    });
  });

  describe("DELETE /api/account", () => {
    const confirm = { confirm: "LÖSCHEN", password: TEST_PASSWORD };

    it("requires a session", async () => {
      expect((await request("DELETE", "/api/account", undefined, confirm)).statusCode).toBe(401);
    });

    it("refuses without the confirmation word or the right password", async () => {
      await fillWardrobe(a);

      for (const [payload, status] of [
        [{ password: TEST_PASSWORD }, 400],
        [{ confirm: "löschen", password: TEST_PASSWORD }, 400],
        [{ confirm: "LÖSCHEN" }, 403],
        [{ confirm: "LÖSCHEN", password: "wrong-password-123" }, 403],
      ] as const) {
        const response = await request("DELETE", "/api/account", a.cookie, payload);
        expect(response.statusCode, JSON.stringify(payload)).toBe(status);
      }
      expect(await app.repositories.account.profile(a.userId)).not.toBeNull();
      expect(memory.objects.size).toBeGreaterThan(0);
    });

    it("leaves no rows and no files of the user, and nothing of anyone else is touched", async () => {
      await fillWardrobe(a);
      await fillWardrobe(b, "Fremdes Teil");
      const otherObjects = [...memory.objects.keys()].filter((key) => key.includes(b.userId));

      const response = await request("DELETE", "/api/account", a.cookie, confirm);

      expect(response.statusCode).toBe(204);
      const cleared = response.cookies.filter(({ name }) => name.startsWith("kk."));
      expect(cleared.length).toBeGreaterThan(0);
      for (const cookie of cleared) {
        expect(cookie.value).toBe("");
        expect(cookie.maxAge).toBe(0);
      }

      const where = { userId: a.userId };
      expect(await app.prisma.user.count({ where: { id: a.userId } })).toBe(0);
      expect(await app.prisma.session.count({ where })).toBe(0);
      expect(await app.prisma.account.count({ where })).toBe(0);
      expect(await app.prisma.item.count({ where })).toBe(0);
      expect(await app.prisma.receipt.count({ where })).toBe(0);
      expect(await app.prisma.outfit.count({ where })).toBe(0);
      expect(await app.prisma.outfitItem.count({ where: { outfit: where } })).toBe(0);
      expect(await app.prisma.verification.count({ where: { value: a.userId } })).toBe(0);
      expect([...memory.objects.keys()].filter((key) => key.includes(a.userId))).toEqual([]);

      // The other user keeps everything.
      expect([...memory.objects.keys()].filter((key) => key.includes(b.userId))).toEqual(
        otherObjects,
      );
      expect(await app.repositories.items.list(b.userId)).toHaveLength(1);
      expect(await app.repositories.outfits.list(b.userId)).toHaveLength(1);

      // The old session cookie no longer works.
      expect((await request("GET", "/api/account", a.cookie)).statusCode).toBe(401);
    });

    it("removes open password reset tokens", async () => {
      await app.inject({
        method: "POST",
        url: "/api/auth/request-password-reset",
        headers: browserHeaders(app),
        payload: { email: "user-a@example.test", redirectTo: "/passwort-zuruecksetzen" },
      });
      expect(await app.prisma.verification.count({ where: { value: a.userId } })).toBe(1);

      await request("DELETE", "/api/account", a.cookie, confirm);

      expect(await app.prisma.verification.count({ where: { value: a.userId } })).toBe(0);
    });
  });
});
