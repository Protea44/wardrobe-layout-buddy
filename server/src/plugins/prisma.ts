import { PrismaPg } from "@prisma/adapter-pg";
import fp from "fastify-plugin";

import { PrismaClient } from "../generated/prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp<{ databaseUrl: string }>(async (app, { databaseUrl }) => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

  app.decorate("prisma", prisma);
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
