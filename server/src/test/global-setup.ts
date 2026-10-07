import { execSync } from "node:child_process";
import path from "node:path";

// Brings the test database up to date before the first test file runs.
export default function setup() {
  execSync("npx prisma migrate deploy", {
    cwd: path.resolve(import.meta.dirname, "../.."),
    env: { ...process.env, DATABASE_URL: process.env["TEST_DATABASE_URL"] },
    stdio: "pipe",
  });
}
