import fp from "fastify-plugin";

import type { Storage } from "../lib/storage";

declare module "fastify" {
  interface FastifyInstance {
    storage: Storage;
  }
}

export const storagePlugin = fp<{ storage: Storage }>(async (app, { storage }) => {
  app.decorate("storage", storage);
});
