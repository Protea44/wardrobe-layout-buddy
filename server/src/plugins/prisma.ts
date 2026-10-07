import { PrismaPg } from "@prisma/adapter-pg";
import fp from "fastify-plugin";

import { PrismaClient } from "../generated/prisma/client";
import { createRepositories, type Repositories } from "../repositories";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    // Routes read and write user data through these, never through prisma directly.
    repositories: Repositories;
  }
}

export const prismaPlugin = fp<{ databaseUrl: string }>(async (app, { databaseUrl }) => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  app.decorate("prisma", prisma);
  app.decorate("repositories", createRepositories(prisma));
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
