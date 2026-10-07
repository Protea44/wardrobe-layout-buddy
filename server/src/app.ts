import Fastify from "fastify";

import type { AppConfig } from "./config";
import { loadFrontend } from "./lib/frontend";
import { loggerOptions } from "./lib/logger";
import { createMailer, type Mailer } from "./lib/mailer";
import { createStorage, type Storage } from "./lib/storage";
import { authPlugin } from "./plugins/auth";
import { frontendPlugin } from "./plugins/frontend";
import { prismaPlugin } from "./plugins/prisma";
import { securityPlugin } from "./plugins/security";
import { storagePlugin } from "./plugins/storage";
import { authRoutes } from "./routes/auth";
import { filesRoutes } from "./routes/files";
import { healthRoutes } from "./routes/health";
import { inboundRoutes } from "./routes/inbound";
import { itemsRoutes } from "./routes/items";
import { receiptsRoutes } from "./routes/receipts";

export type BuildAppOptions = {
  config: AppConfig;
  // Overrides for tests.
  storage?: Storage;
  mailer?: Mailer;
  logStream?: NodeJS.WritableStream;
};

export async function buildApp({ config, storage, mailer, logStream }: BuildAppOptions) {
  const app = Fastify({
    logger: loggerOptions(config, logStream),
    bodyLimit: config.BODY_LIMIT_BYTES,
    trustProxy: config.TRUST_PROXY,
  });

  const frontend = config.NODE_ENV === "production" ? loadFrontend(config.FRONTEND_DIR) : null;

  await app.register(securityPlugin, { config });
  await app.register(prismaPlugin, { databaseUrl: config.DATABASE_URL });
  await app.register(storagePlugin, { storage: storage ?? createStorage(config) });
  await app.register(authPlugin, { config, mailer: mailer ?? createMailer(config) });

  await app.register(
    async (api) => {
      await api.register(healthRoutes);
      await api.register(authRoutes, { config });
      await api.register(filesRoutes, { config });
      await api.register(itemsRoutes, { config });
      await api.register(receiptsRoutes, { config });
      await api.register(inboundRoutes, { config });
    },
    { prefix: "/api" },
  );

  await app.register(frontendPlugin, { frontend });

  return app;
}
