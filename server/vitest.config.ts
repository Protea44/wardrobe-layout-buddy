import { existsSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

const repoRoot = path.resolve(import.meta.dirname, "..");
const envFile = path.join(repoRoot, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

// Tests must never touch the development database.
const testDatabaseUrl = process.env["TEST_DATABASE_URL"];
if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is not set. Copy .env.example to .env first.");
}
if (testDatabaseUrl === process.env["DATABASE_URL"]) {
  throw new Error("TEST_DATABASE_URL must point to a different database than DATABASE_URL.");
}

export default defineConfig({
  resolve: {
    alias: { "@shared": path.join(repoRoot, "shared") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globalSetup: ["./src/test/global-setup.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: testDatabaseUrl,
      LOG_LEVEL: "silent",
    },
  },
});
