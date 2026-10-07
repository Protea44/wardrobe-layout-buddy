import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { outfitResponseSchema, type OutfitResponse } from "@shared/outfit";

import {
  browserHeaders,
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";

describe("outfit routes", () => {
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

  const createItem = async (user: TestUser, name: string) =>
    (await app.repositories.items.create(user.userId, { name, category: "Oberteil" })).id;

  const place = (itemId: string, zIndex = 0) => ({ itemId, x: 0.5, y: 0.4, scale: 1.2, zIndex });

  function request(
    method: "GET" | "POST" | "PUT" | "DELETE",
    url: string,
    cookie?: string,
    payload?: unknown,
  ) {
    return app.inject({
      method,
      url,
      headers: browserHeaders(app, cookie),
      ...(payload !== undefined && { payload: payload as Record<string, unknown> }),
    });
  }

  async function createOutfit(user: TestUser, items: ReturnType<typeof place>[] = []) {
    const response = await request("POST", "/api/outfits", user.cookie, {
      name: "Büro",
      occasion: "Arbeit",
      items,
    });
    expect(response.statusCode, response.body).toBe(201);
    return outfitResponseSchema.parse(response.json());
  }

  it("requires a session on every route", async () => {
    const outfit = await createOutfit(a);
    for (const [method, url] of [
      ["GET", "/api/outfits"],
      ["POST", "/api/outfits"],
      ["GET", `/api/outfits/${outfit.id}`],
      ["PUT", `/api/outfits/${outfit.id}`],
      ["DELETE", `/api/outfits/${outfit.id}`],
    ] as const) {
      const response = await request(method, url, undefined, { name: "X", items: [] });
      expect(response.statusCode, `${method} ${url}`).toBe(401);
    }
  });

  it("creates an outfit with placements, item names and thumbnails", async () => {
    const shirt = await createItem(a, "Hemd");
    const trousers = await createItem(a, "Hose");

    const outfit = await createOutfit(a, [place(shirt, 1), place(trousers, 0)]);

    expect(outfit).toMatchObject({ name: "Büro", occasion: "Arbeit" });
    expect(outfit.items.map(({ name, zIndex }) => ({ name, zIndex }))).toEqual([
      { name: "Hose", zIndex: 0 },
      { name: "Hemd", zIndex: 1 },
    ]);
    expect(outfit.items[0]).toMatchObject({ x: 0.5, y: 0.4, scale: 1.2, thumbnailKey: null });
  });

  it("lists and reads only the user's outfits", async () => {
    const outfit = await createOutfit(a);
    await createOutfit(b);

    const list = await request("GET", "/api/outfits", a.cookie);
    const own = await request("GET", `/api/outfits/${outfit.id}`, a.cookie);
    const foreign = await request("GET", `/api/outfits/${outfit.id}`, b.cookie);

    expect(list.json<OutfitResponse[]>().map(({ id }) => id)).toEqual([outfit.id]);
    expect(own.statusCode).toBe(200);
    expect(foreign.statusCode).toBe(404);
  });

  it("replaces name, occasion and all placements", async () => {
    const shirt = await createItem(a, "Hemd");
    const trousers = await createItem(a, "Hose");
    const coat = await createItem(a, "Mantel");
    const outfit = await createOutfit(a, [place(shirt), place(trousers, 1)]);

    const response = await request("PUT", `/api/outfits/${outfit.id}`, a.cookie, {
      name: "Wochenende",
      occasion: null,
      items: [{ ...place(coat), x: 0, y: 1 }, place(shirt, 1)],
    });

    expect(response.statusCode).toBe(200);
    const updated = outfitResponseSchema.parse(response.json());
    expect(updated).toMatchObject({ name: "Wochenende", occasion: null });
    expect(updated.items.map(({ name, x, y }) => ({ name, x, y }))).toEqual([
      { name: "Mantel", x: 0, y: 1 },
      { name: "Hemd", x: 0.5, y: 0.4 },
    ]);
  });

  it("answers 404 for another user's item and changes nothing", async () => {
    const shirt = await createItem(a, "Hemd");
    const foreign = await createItem(b, "Fremd");
    const outfit = await createOutfit(a, [place(shirt)]);

    const created = await request("POST", "/api/outfits", a.cookie, {
      name: "Neu",
      items: [place(foreign)],
    });
    const replaced = await request("PUT", `/api/outfits/${outfit.id}`, a.cookie, {
      name: "Gekapert",
      items: [place(shirt), place(foreign, 1)],
    });

    expect(created.statusCode).toBe(404);
    expect(replaced.statusCode).toBe(404);
    const unchanged = await app.repositories.outfits.get(a.userId, outfit.id);
    expect(unchanged?.name).toBe("Büro");
    expect(unchanged?.items.map(({ itemId }) => itemId)).toEqual([shirt]);
    expect(await app.repositories.outfits.list(a.userId)).toHaveLength(1);
  });

  it("answers 404 when another user changes or deletes an outfit", async () => {
    const outfit = await createOutfit(a);

    const replaced = await request("PUT", `/api/outfits/${outfit.id}`, b.cookie, {
      name: "Gekapert",
      items: [],
    });
    const deleted = await request("DELETE", `/api/outfits/${outfit.id}`, b.cookie);

    expect(replaced.statusCode).toBe(404);
    expect(deleted.statusCode).toBe(404);
    expect((await app.repositories.outfits.get(a.userId, outfit.id))?.name).toBe("Büro");
  });

  it("refuses invalid outfits", async () => {
    const shirt = await createItem(a, "Hemd");
    for (const payload of [
      { name: "", items: [] },
      { name: "Büro" },
      { name: "Büro", items: [place(shirt), place(shirt, 1)] },
      { name: "Büro", items: [{ ...place(shirt), x: 1.5 }] },
      { name: "Büro", items: [{ ...place(shirt), scale: 0 }] },
      { name: "Büro", items: [], userId: b.userId },
    ]) {
      const response = await request("POST", "/api/outfits", a.cookie, payload);
      expect(response.statusCode, JSON.stringify(payload)).toBe(400);
    }
  });

  it("deletes an outfit and keeps its items", async () => {
    const shirt = await createItem(a, "Hemd");
    const outfit = await createOutfit(a, [place(shirt)]);

    const response = await request("DELETE", `/api/outfits/${outfit.id}`, a.cookie);

    expect(response.statusCode).toBe(204);
    expect(await app.repositories.outfits.get(a.userId, outfit.id)).toBeNull();
    expect(await app.repositories.items.get(a.userId, shirt)).not.toBeNull();
  });
});
