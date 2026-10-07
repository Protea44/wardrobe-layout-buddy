import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// The Prisma CLI runs from /server; the env file lives in the repo root.
if (existsSync("../.env")) process.loadEnvFile("../.env");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Empty while generating the client, which needs no connection.
  datasource: { url: process.env["DATABASE_URL"] ?? "" },
});