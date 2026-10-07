import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";

import type { AppConfig } from "../config";
import { toFetchHeaders } from "../plugins/auth";

type AuthRoutesOptions = {
  config: Pick<AppConfig, "APP_URL" | "AUTH_RATE_LIMIT_MAX">;
};

// Hands /api/auth/* to Better Auth: sign-up, sign-in, sign-out, session and password reset.
export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, { config }) => {
  async function handle(request: FastifyRequest, reply: FastifyReply) {
    const headers = toFetchHeaders(request);
    // The body is re-serialised below, so the original length no longer applies.
    headers.delete("content-length");

    const hasBody = request.method !== "GET" && request.body !== undefined;
    const response = await app.auth.handler(
      new Request(new URL(request.url, config.APP_URL), {
        method: request.method,
        headers,
        ...(hasBody && { body: JSON.stringify(request.body) }),
      }),
    );

    reply.code(response.status);
    response.headers.forEach((value, name) => {
      // forEach joins repeated headers; cookies have to stay separate.
      if (name !== "set-cookie") reply.header(name, value);
    });
    const cookies = response.headers.getSetCookie();
    if (cookies.length > 0) reply.header("set-cookie", cookies);
    return reply.send(await response.text());
  }

  app.get("/auth/*", handle);
  // Everything that takes credentials or sends mail gets a much tighter limit
  // than the global one, to slow down password guessing.
  app.post(
    "/auth/*",
    { config: { rateLimit: { max: config.AUTH_RATE_LIMIT_MAX, timeWindow: "1 minute" } } },
    handle,
  );
};
