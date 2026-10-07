import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyRequest {
    // Id of the logged-in user, or null for an anonymous request.
    userId: string | null;
  }
}

export type ResolveUserId = (request: FastifyRequest) => Promise<string | null> | string | null;

type AuthOptions = {
  resolveUserId?: ResolveUserId;
};

// Placeholder until authentication exists: every request is anonymous, so routes
// that require a user answer 401. The auth task replaces the default resolver
// with the session lookup.
export const authPlugin = fp<AuthOptions>(async (app, { resolveUserId = () => null }) => {
  app.decorateRequest("userId", null);
  app.addHook("onRequest", async (request) => {
    request.userId = await resolveUserId(request);
  });
});