import type { FastifyPluginAsync } from "fastify";

import { sendUnauthorized } from "../lib/http-errors";

export const meRoutes: FastifyPluginAsync = async (app) => {
  app.get("/me", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);

    const profile = await app.repositories.users.getProfile(request.userId);
    if (profile === null) return sendUnauthorized(reply);
    return profile;
  });
};
