import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  browserHeaders,
  buildTestApp,
  createFakeMailer,
  resetDatabase,
  sessionCookie,
  signUp,
  TEST_PASSWORD,
  type TestApp,
} from "../test/build-test-app";

const EMAIL = "anna@example.test";

describe("authentication", () => {
  let app: TestApp;
  let sent: ReturnType<typeof createFakeMailer>["sent"];

  beforeEach(async () => {
    const fake = createFakeMailer();
    sent = fake.sent;
    app = await buildTestApp({ mailer: fake.mailer });
    await resetDatabase(app);
  });
  afterEach(() => app.close());

  function post(path: string, payload: Record<string, unknown>, cookie?: string) {
    return app.inject({
      method: "POST",
      url: `/api/auth${path}`,
      headers: browserHeaders(app, cookie),
      payload,
    });
  }

  function getSession(cookie?: string) {
    return app.inject({
      method: "GET",
      url: "/api/auth/get-session",
      headers: browserHeaders(app, cookie),
    });
  }

  it("registers a user, logs them in and stores only a password hash", async () => {
    const response = await post("/sign-up/email", {
      name: "Anna",
      email: EMAIL,
      password: TEST_PASSWORD,
    });

    expect(response.statusCode).toBe(200);
    const session = await getSession(sessionCookie(response));
    expect(session.json()).toMatchObject({ user: { email: EMAIL, name: "Anna" } });

    const account = await app.prisma.account.findFirstOrThrow();
    expect(account.password).toBeTruthy();
    expect(account.password).not.toContain(TEST_PASSWORD);
  });

  it("sets the session as an HttpOnly, SameSite cookie and stores no IP address", async () => {
    const response = await post("/sign-up/email", {
      name: "Anna",
      email: EMAIL,
      password: TEST_PASSWORD,
    });

    const cookie = response.cookies.find(({ name }) => name === "kk.session_token");
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "Lax", path: "/" });

    const session = await app.prisma.session.findFirstOrThrow();
    expect(session.ipAddress ?? "").toBe("");
  });

  it("has no session without a cookie", async () => {
    const response = await getSession();

    expect(response.statusCode).toBe(200);
    expect(response.json()).toBeNull();
  });

  it("logs in with the right password and rejects a wrong one", async () => {
    await signUp(app, EMAIL);

    const wrong = await post("/sign-in/email", { email: EMAIL, password: "wrong-password" });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.cookies).toEqual([]);

    const right = await post("/sign-in/email", { email: EMAIL, password: TEST_PASSWORD });
    expect(right.statusCode).toBe(200);
    expect((await getSession(sessionCookie(right))).json()).toMatchObject({
      user: { email: EMAIL },
    });
  });

  it("answers an unknown address like a wrong password", async () => {
    await signUp(app, EMAIL);

    const unknown = await post("/sign-in/email", {
      email: "nobody@example.test",
      password: TEST_PASSWORD,
    });
    const wrong = await post("/sign-in/email", { email: EMAIL, password: "wrong-password" });

    expect(unknown.statusCode).toBe(wrong.statusCode);
    expect(unknown.json<{ code: string }>().code).toBe(wrong.json<{ code: string }>().code);
  });

  it("ends the session on logout", async () => {
    const { cookie } = await signUp(app, EMAIL);

    const response = await post("/sign-out", {}, cookie);

    expect(response.statusCode).toBe(200);
    expect((await getSession(cookie)).json()).toBeNull();
    expect(await app.prisma.session.count()).toBe(0);
  });

  it("rejects a password that is too short and a duplicate address", async () => {
    const short = await post("/sign-up/email", { name: "Anna", email: EMAIL, password: "short" });
    expect(short.statusCode).toBe(400);
    expect(await app.prisma.user.count()).toBe(0);

    await signUp(app, EMAIL);
    const duplicate = await post("/sign-up/email", {
      name: "Anna",
      email: EMAIL,
      password: TEST_PASSWORD,
    });
    expect(duplicate.statusCode).toBe(422);
    expect(await app.prisma.user.count()).toBe(1);
  });

  it("rejects a request that carries the session cookie from a foreign origin", async () => {
    const { cookie } = await signUp(app, EMAIL);

    const response = await app.inject({
      method: "POST",
      url: "/api/auth/sign-out",
      headers: { origin: "https://evil.example", cookie },
      payload: {},
    });

    expect(response.statusCode).toBe(403);
    expect((await getSession(cookie)).json()).toMatchObject({ user: { email: EMAIL } });
  });

  it("resets the password through the mailed link and ends existing sessions", async () => {
    const { cookie } = await signUp(app, EMAIL);

    const requested = await post("/request-password-reset", { email: EMAIL });
    expect(requested.statusCode).toBe(200);
    await vi.waitFor(() => expect(sent).toHaveLength(1));

    const mail = sent[0];
    expect(mail?.to).toBe(EMAIL);
    const link = mail?.text.match(/http\S+\/passwort-zuruecksetzen\?token=(\S+)/);
    expect(link?.[0]).toContain(app.auth.options.baseURL);
    const token = decodeURIComponent(link?.[1] ?? "");

    const reset = await post("/reset-password", { token, newPassword: "a-brand-new-password" });
    expect(reset.statusCode).toBe(200);

    expect((await getSession(cookie)).json()).toBeNull();
    const oldPassword = await post("/sign-in/email", { email: EMAIL, password: TEST_PASSWORD });
    expect(oldPassword.statusCode).toBe(401);
    const newPassword = await post("/sign-in/email", {
      email: EMAIL,
      password: "a-brand-new-password",
    });
    expect(newPassword.statusCode).toBe(200);

    const reused = await post("/reset-password", { token, newPassword: "yet-another-password" });
    expect(reused.statusCode).toBe(400);
  });

  it("sends no reset mail for an unknown address but answers the same", async () => {
    const response = await post("/request-password-reset", { email: "nobody@example.test" });

    expect(response.statusCode).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sent).toEqual([]);
  });
});

describe("authentication rate limit", () => {
  it("blocks further sign-in attempts once the limit is reached", async () => {
    const app = await buildTestApp({ config: { AUTH_RATE_LIMIT_MAX: 3 } });
    await resetDatabase(app);

    const statuses: number[] = [];
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/sign-in/email",
        headers: browserHeaders(app),
        payload: { email: EMAIL, password: "wrong-password" },
      });
      statuses.push(response.statusCode);
    }
    await app.close();

    expect(statuses).toEqual([401, 401, 401, 429]);
  });
});

describe("session cookie in production", () => {
  it("is HttpOnly, SameSite=Lax and Secure", async () => {
    // Production also serves the frontend, so it needs a built shell.
    const frontendDir = mkdtempSync(path.join(tmpdir(), "kk-frontend-"));
    writeFileSync(path.join(frontendDir, "index.html"), "<!doctype html>");
    const app = await buildTestApp({
      config: { NODE_ENV: "production", FRONTEND_DIR: frontendDir },
    });
    try {
      await resetDatabase(app);
      const response = await app.inject({
        method: "POST",
        url: "/api/auth/sign-up/email",
        headers: browserHeaders(app),
        payload: { name: "Test", email: "secure@example.test", password: TEST_PASSWORD },
      });

      const session = response.cookies.find(({ name }) => name.endsWith("kk.session_token"));
      expect(session).toMatchObject({ httpOnly: true, sameSite: "Lax", secure: true });
    } finally {
      await app.close();
      rmSync(frontendDir, { recursive: true, force: true });
    }
  });
});
