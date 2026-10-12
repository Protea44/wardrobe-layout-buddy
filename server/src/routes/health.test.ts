import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { healthResponseSchema } from "@shared/health";

import { buildTestApp } from "../test/build-test-app";

describe("GET /api/health", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>>;

  beforeAll(async () => {
    app = await buildTestApp();
  });
  afterAll(() => app.close());

  it("returns { ok: true }", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    expect(healthResponseSchema.safeParse(response.json()).success).toBe(true);
  });

  it("sends the strict content security policy and no HSTS outside production", async () => {
    const response = await app.inject({ method: "GET", url: "/api/health" });

    const csp = response.headers["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("img-src 'self' blob: data:");
    expect(csp).toContain("script-src 'self';");
    expect(csp).not.toMatch(/https?:|unsafe-eval|\*/);
    // Only styles may be inline (toasts, dialog scroll lock); never scripts.
    const inline = String(csp)
      .split(";")
      .filter((directive) => directive.includes("unsafe-inline"));
    expect(inline).toEqual(["style-src 'self' 'unsafe-inline'"]);
    expect(response.headers["strict-transport-security"]).toBeUndefined();
  });

  it("answers unknown API routes with a JSON 404", async () => {
    const response = await app.inject({ method: "GET", url: "/api/does-not-exist" });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ statusCode: 404 });
  });

  it("runs against the test database", async () => {
    const rows = await app.prisma.$queryRaw<{ name: string }[]>`SELECT current_database() AS name`;

    expect(rows[0]?.name).toMatch(/_test$/);
  });
});
