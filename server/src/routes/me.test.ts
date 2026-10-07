import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { meResponseSchema } from "@shared/me";

import {
  browserHeaders,
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";

describe("GET /api/me", () => {
  let app: TestApp;
  let a: TestUser;
  let b: TestUser;

  beforeAll(async () => {
    app = await buildTestApp();
    await resetDatabase(app);
    ({ a, b } = await createTwoUsers(app));
  });
  afterAll(() => app.close());

  const getMe = (cookie?: string) =>
    app.inject({ method: "GET", url: "/api/me", headers: browserHeaders(app, cookie) });

  it("answers 401 without a session", async () => {
    const response = await getMe();

    expect(response.statusCode).toBe(401);
  });

  it("answers 401 for a forged session cookie", async () => {
    const response = await getMe("kk.session_token=forged.value");

    expect(response.statusCode).toBe(401);
  });

  it("returns the profile of the logged-in user and nobody else's", async () => {
    const own = await getMe(a.cookie);
    const other = await getMe(b.cookie);

    expect(own.statusCode).toBe(200);
    expect(meResponseSchema.parse(own.json())).toEqual({
      id: a.userId,
      email: "user-a@example.test",
      displayName: "Test Person",
    });
    expect(other.json()).toMatchObject({ id: b.userId, email: "user-b@example.test" });
  });

  it("answers 401 once the account is gone", async () => {
    await app.prisma.user.delete({ where: { id: b.userId } });

    const response = await getMe(b.cookie);

    expect(response.statusCode).toBe(401);
  });
});
