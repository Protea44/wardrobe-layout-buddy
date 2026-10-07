import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  itemFacetsSchema,
  itemListResponseSchema,
  itemResponseSchema,
  type ItemCreateInput,
  type ItemListResponse,
} from "@shared/item";

import {
  browserHeaders,
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";

describe("item list routes", () => {
  let app: TestApp;
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    app = await buildTestApp();
  });
  beforeEach(async () => {
    await resetDatabase(app);
    ({ a, b } = await createTwoUsers(app));
  });
  afterAll(() => app.close());

  // Creates items in the given order, each one minute newer than the one before.
  async function seed(user: TestUser, inputs: ItemCreateInput[]) {
    const ids: string[] = [];
    for (const [index, input] of inputs.entries()) {
      const item = await app.repositories.items.create(user.userId, input);
      await app.prisma.item.update({
        where: { id: item.id },
        data: { createdAt: new Date(Date.UTC(2026, 0, 1, 0, index)) },
      });
      ids.push(item.id);
    }
    return ids;
  }

  function get(url: string, cookie?: string) {
    return app.inject({ method: "GET", url, headers: browserHeaders(app, cookie) });
  }

  async function list(query: string, user: TestUser = a) {
    const response = await get(`/api/items${query}`, user.cookie);
    expect(response.statusCode, response.body).toBe(200);
    return itemListResponseSchema.parse(response.json());
  }

  const names = (page: ItemListResponse) => page.items.map((item) => item.name);

  describe("GET /api/items", () => {
    it("requires a session", async () => {
      expect((await get("/api/items")).statusCode).toBe(401);
    });

    it("lists only the user's active items, newest first", async () => {
      const [, sold] = await seed(a, [
        { name: "Alt", category: "Hose" },
        { name: "Verkauft", category: "Hose" },
        { name: "Neu", category: "Rock" },
      ]);
      await seed(b, [{ name: "Fremd", category: "Hose" }]);
      await app.repositories.items.update(a.userId, sold ?? "", { lifecycleStatus: "SOLD" });

      const page = await list("");

      expect(names(page)).toEqual(["Neu", "Alt"]);
      expect(page.total).toBe(2);
      expect(page.nextCursor).toBeNull();
    });

    it("searches name, brand, material and notes case-insensitively", async () => {
      await seed(a, [
        { name: "Leinenhemd", category: "Oberteil" },
        { name: "Hose", category: "Hose", brand: "LEINEN & Co" },
        { name: "Kleid", category: "Kleid", material: "100 % Leinen" },
        { name: "Rock", category: "Rock", notes: "Aus leinen, knittert" },
        { name: "Pullover", category: "Strick", material: "Wolle" },
      ]);

      const page = await list("?q=leinen");

      expect(names(page).sort()).toEqual(["Hose", "Kleid", "Leinenhemd", "Rock"]);
      expect(page.total).toBe(4);
    });

    it("filters by category, color, brand and season", async () => {
      await seed(a, [
        { name: "A", category: "Hose", color: "Blau", brand: "X", seasons: ["sommer"] },
        { name: "B", category: "Hose", color: "Blau", brand: "Y", seasons: ["winter"] },
        { name: "C", category: "Hose", color: "Rot", brand: "X", seasons: ["sommer"] },
        { name: "D", category: "Rock", color: "Blau", brand: "X", seasons: ["sommer"] },
      ]);

      expect(names(await list("?category=Hose&color=Blau&brand=X&season=sommer"))).toEqual(["A"]);
      expect((await list("?category=Hose")).total).toBe(3);
      expect((await list("?season=winter")).total).toBe(1);
      // Empty parameters mean "no filter".
      expect((await list("?category=&q=")).total).toBe(4);
    });

    it("sorts by purchase date and price with missing values last", async () => {
      await seed(a, [
        { name: "Ohne", category: "Hose" },
        { name: "Billig", category: "Hose", price: "9.99", purchaseDate: "2026-01-10" },
        { name: "Teuer", category: "Hose", price: "199.00", purchaseDate: "2025-05-01" },
        { name: "Mittel", category: "Hose", price: "49.90", purchaseDate: "2026-03-01" },
      ]);

      expect(names(await list("?sort=purchaseDate"))).toEqual([
        "Mittel",
        "Billig",
        "Teuer",
        "Ohne",
      ]);
      expect(names(await list("?sort=priceAsc"))).toEqual(["Billig", "Mittel", "Teuer", "Ohne"]);
      expect(names(await list("?sort=priceDesc"))).toEqual(["Teuer", "Mittel", "Billig", "Ohne"]);
    });

    it("pages through every sort with the cursor, without gaps or duplicates", async () => {
      // Ties and missing values on purpose, so the id has to break them.
      await seed(
        a,
        Array.from({ length: 7 }, (_, index) => ({
          name: `Teil ${index}`,
          category: "Hose",
          ...(index % 3 !== 0 && { price: index % 2 === 0 ? "20.00" : "10.00" }),
          ...(index % 2 === 0 && { purchaseDate: "2026-02-01" }),
        })),
      );

      for (const sort of ["newest", "purchaseDate", "priceAsc", "priceDesc"]) {
        const everything = names(await list(`?sort=${sort}&limit=100`));
        const paged: string[] = [];
        let cursor: string | null = null;
        do {
          const query: string = `?sort=${sort}&limit=3${cursor ? `&cursor=${cursor}` : ""}`;
          const page = await list(query);
          expect(page.total).toBe(7);
          paged.push(...names(page));
          cursor = page.nextCursor;
        } while (cursor !== null);

        expect(paged, sort).toEqual(everything);
        expect(new Set(paged).size).toBe(7);
      }
    });

    it("uses 60 items per page by default", async () => {
      await seed(
        a,
        Array.from({ length: 61 }, (_, index) => ({ name: `Teil ${index}`, category: "Hose" })),
      );

      const first = await list("");
      const second = await list(`?cursor=${first.nextCursor}`);

      expect(first.items).toHaveLength(60);
      expect(second.items).toHaveLength(1);
      expect(second.nextCursor).toBeNull();
    });

    it("refuses invalid parameters and forged cursors", async () => {
      for (const query of [
        "?sort=random",
        "?season=monsun",
        "?limit=0",
        "?limit=101",
        "?cursor=not-a-cursor",
        `?cursor=${Buffer.from('{"value":"abc","id":"x"}').toString("base64url")}&sort=priceAsc`,
        `?cursor=${Buffer.from('{"value":null,"id":"x"}').toString("base64url")}`,
      ]) {
        const response = await get(`/api/items${query}`, a.cookie);
        expect(response.statusCode, query).toBe(400);
      }
    });
  });

  describe("GET /api/items/facets", () => {
    it("requires a session", async () => {
      expect((await get("/api/items/facets")).statusCode).toBe(401);
    });

    it("returns the distinct values of the user's active items only", async () => {
      const [, sold] = await seed(a, [
        { name: "A", category: "Hose", color: "Blau", brand: "Y", seasons: ["winter", "sommer"] },
        { name: "B", category: "Tasche", color: "Grün", brand: "Z", seasons: ["herbst"] },
        { name: "C", category: "Hose", color: "Blau", brand: "Ä-Marke", seasons: ["sommer"] },
      ]);
      await seed(b, [{ name: "Fremd", category: "Kleid", color: "Rot", brand: "Fremdmarke" }]);
      await app.repositories.items.update(a.userId, sold ?? "", { lifecycleStatus: "SOLD" });

      const response = await get("/api/items/facets", a.cookie);

      expect(response.statusCode).toBe(200);
      expect(itemFacetsSchema.parse(response.json())).toEqual({
        categories: ["Hose"],
        colors: ["Blau"],
        brands: ["Ä-Marke", "Y"],
        seasons: ["sommer", "winter"],
      });
    });
  });

  describe("GET /api/items/:id", () => {
    it("returns the owner's item and 404 to anyone else", async () => {
      const [id] = await seed(a, [{ name: "Mantel", category: "Jacke & Mantel" }]);

      const own = await get(`/api/items/${id}`, a.cookie);
      const foreign = await get(`/api/items/${id}`, b.cookie);
      const anonymous = await get(`/api/items/${id}`);
      const missing = await get("/api/items/does-not-exist", a.cookie);

      expect(own.statusCode).toBe(200);
      expect(itemResponseSchema.parse(own.json()).name).toBe("Mantel");
      expect(foreign.statusCode).toBe(404);
      expect(anonymous.statusCode).toBe(401);
      expect(missing.statusCode).toBe(404);
    });
  });
});
