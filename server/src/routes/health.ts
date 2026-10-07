import type { FastifyPluginAsync } from "fastify";

import type { HealthResponse } from "@shared/health";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health", async (): Promise<HealthResponse> => ({ ok: true }));
};
