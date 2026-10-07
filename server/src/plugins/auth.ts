import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { AUTH_BASE_PATH, createAuth, type Auth } from "../lib/auth";
import type { AppConfig } from "../config";
import type { Mailer } from "../lib/mailer";

declare module "fastify" {
  interface FastifyInstance {
    auth: Auth;
  }
  interface FastifyRequest {
    // Id of the logged-in user, or null for an anonymous request.
    userId: string | null;
  }
}

type AuthOptions = {
  config: Pick<AppConfig, "APP_URL" | "BETTER_AUTH_SECRET">;
  mailer: Mailer;
};

// Fastify keeps headers as a plain object; Better Auth expects the Fetch API's Headers.
export function toFetchHeaders(request: FastifyRequest) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    for (const single of Array.isArray(value) ? value : [value]) headers.append(name, single);
  }
  return headers;
}

// Needs the prisma plugin. Sets request.userId from the session cookie.
export const authPlugin = fp<AuthOptions>(async (app, { config, mailer }) => {
  const auth = createAuth({ config, mailer, prisma: app.prisma, log: app.log });
  app.decorate("auth", auth);

  app.decorateRequest("userId", null);
  app.addHook("onRequest", async (request) => {
    // Only API routes look at the user, and without a cookie there is no session
    // to look up. Better Auth's own routes read the session themselves.
    const isApiRoute = request.url.startsWith("/api/") && !request.url.startsWith(AUTH_BASE_PATH);
    if (!isApiRoute || request.headers.cookie === undefined) return;

    const session = await auth.api.getSession({ headers: toFetchHeaders(request) });
    request.userId = session?.user.id ?? null;
  });
});
