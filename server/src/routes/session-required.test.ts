import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildTestApp, type TestApp } from "../test/build-test-app";

// Routes that work without a session: health check, Better Auth itself, and
// the inbound mail hook, which has its own secret.
const PUBLIC = [/^\/api\/health$/, /^\/api\/auth\//, /^\/api\/inbound\//];

type Route = { method: string; url: string };

describe("session requirement", () => {
  let app: TestApp;
  const routes: Route[] = [];

  // Every registered /api route, as Fastify registers it.
  beforeAll(async () => {
    app = await buildTestApp({
      onRoute: (route) => {
        const methods = Array.isArray(route.method) ? route.method : [route.method];
        for (const method of methods) {
          if (route.url.startsWith("/api/") && method !== "HEAD" && method !== "OPTIONS") {
            routes.push({ method, url: route.url });
          }
        }
      },
    });
    await app.ready();
  });
  afterAll(() => app.close());

  it("finds the routes it checks", () => {
    const urls = routes.map(({ method, url }) => `${method} ${url}`);
    for (const known of [
      "GET /api/items",
      "PUT /api/items/:id/photo",
      "GET /api/account/export",
      "DELETE /api/account",
      "PUT /api/outfits/:id",
      "GET /api/receipts/forwarding-alias",
      "GET /api/files/:bucket/*",
      "POST /api/receipts/:id/items",
    ]) {
      expect(urls).toContain(known);
    }
  });

  it("answers 401 on every non-public /api route without a session", async () => {
    const guarded = routes.filter(({ url }) => !PUBLIC.some((pattern) => pattern.test(url)));
    expect(guarded.length).toBeGreaterThan(15);

    for (const { method, url } of guarded) {
      const concrete = url
        .replace(/:bucket/g, "item-photos")
        .replace(/:[a-zA-Z]+/g, "00000000-0000-4000-8000-000000000000")
        .replace(/\*/g, "some/file.webp");
      const response = await app.inject({
        method: method as "GET",
        url: concrete,
        ...(method !== "GET" && { payload: {} }),
      });
      expect(response.statusCode, `${method} ${url}`).toBe(401);
    }
  });
});
