import { buildApp, type BuildAppOptions } from "../app";
import { loadConfig, type AppConfig } from "../config";
import type { Mailer, MailMessage } from "../lib/mailer";
import type { Storage } from "../lib/storage";

export type TestApp = Awaited<ReturnType<typeof buildApp>>;

// Storage that fails loudly: tests that reach storage must pass their own.
const unusedStorage: Storage = {
  putObject: () => Promise.reject(new Error("storage not available in this test")),
  getObjectStream: () => Promise.reject(new Error("storage not available in this test")),
  deleteObject: () => Promise.reject(new Error("storage not available in this test")),
  deletePrefix: () => Promise.reject(new Error("storage not available in this test")),
};

// Collects mails instead of sending them.
export function createFakeMailer() {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    send: (message) => {
      sent.push(message);
      return Promise.resolve();
    },
  };
  return { mailer, sent };
}

type TestAppOptions = Partial<Omit<BuildAppOptions, "config">> & {
  config?: Partial<AppConfig>;
};

export function buildTestApp({ config, ...overrides }: TestAppOptions = {}) {
  return buildApp({
    config: { ...loadConfig(), ...config },
    storage: unusedStorage,
    mailer: createFakeMailer().mailer,
    ...overrides,
  });
}

// Removes all users and, through cascades, their sessions and accounts.
export async function resetDatabase(app: TestApp) {
  await app.prisma.$executeRaw`TRUNCATE TABLE "user", "verification" CASCADE`;
}

export const TEST_PASSWORD = "correct-horse-battery";

// Headers a browser on the app's own origin would send.
export function browserHeaders(app: TestApp, cookie?: string) {
  return {
    origin: app.auth.options.baseURL ?? "",
    ...(cookie !== undefined && { cookie }),
  };
}

type InjectResponse = Awaited<ReturnType<TestApp["inject"]>>;

export function sessionCookie(response: InjectResponse) {
  return response.cookies.map(({ name, value }) => `${name}=${value}`).join("; ");
}

// Registers a user and returns the id and the session cookie of the new account.
export async function signUp(app: TestApp, email: string, password = TEST_PASSWORD) {
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-up/email",
    headers: browserHeaders(app),
    payload: { name: "Test Person", email, password },
  });
  if (response.statusCode !== 200) {
    throw new Error(`sign-up failed with ${response.statusCode}: ${response.body}`);
  }
  const body = response.json<{ user: { id: string } }>();
  return { userId: body.user.id, cookie: sessionCookie(response) };
}

export type TestUser = Awaited<ReturnType<typeof signUp>>;

// Two separate accounts, for proving that one cannot reach the other's data.
export async function createTwoUsers(app: TestApp) {
  const a = await signUp(app, "user-a@example.test");
  const b = await signUp(app, "user-b@example.test");
  return { a, b };
}
