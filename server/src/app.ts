import Fastify from "fastify";

import type { AppConfig } from "./config";
import { loadFrontend } from "./lib/frontend";
import { loggerOptions } from "./lib/logger";
import { createStorage, type Storage } from "./lib/storage";
import { authPlugin, type ResolveUserId } from "./plugins/auth";
import { frontendPlugin } from "./plugins/frontend";
import { prismaPlugin } from "./plugins/prisma";
import { securityPlugin } from "./plugins/security";
import { storagePlugin } from "./plugins/storage";
import { filesRoutes } from "./routes/files";
import { healthRoutes } from "./routes/health";

export type BuildAppOptions = {
  config: AppConfig;
  // Overrides for tests.
  storage?: Storage;
  resolveUserId?: ResolveUserId;
  logStream?: NodeJS.WritableStream;
};

export async function buildApp({ config, storage, resolveUserId, logStream }: BuildAppOptions) {
  const app = Fastify({
    logger: loggerOptions(config, logStream),
    bodyLimit: config.BODY_LIMIT_BYTES,
    trustProxy: config.TRUST_PROXY,
  });

  const frontend = config.NODE_ENV === "production" ? loadFrontend(config.FRONTEND_DIR) : null;

  await app.register(securityPlugin, {
    config,
    scriptHashes: frontend?.inlineScriptHashes ?? [],
  });
  await app.register(prismaPlugin, { databaseUrl: config.DATABASE_URL });
  await app.register(storagePlugin, { storage: storage ?? createStorage(config) });
  await app.register(authPlugin, resolveUserId ? { resolveUserId } : {});

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(filesRoutes, { config });
    },
    { prefix: "/api" },
  );

  if (frontend) await app.register(frontendPlugin, { frontend });

  return app;
}