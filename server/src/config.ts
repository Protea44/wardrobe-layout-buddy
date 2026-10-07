import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

// This file sits one level below /server both as src/config.ts and when bundled
// into dist/server.js, so the repo root is two levels up in either case.
const repoRoot = path.resolve(import.meta.dirname, "../..");

const booleanString = z.enum(["true", "false"]).transform((value) => value === "true");

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().min(1).default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  TRUST_PROXY: booleanString.default("false"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1_048_576),
  FRONTEND_DIR: z.string().min(1).default(path.join(repoRoot, "dist")),

  DATABASE_URL: z.string().url(),

  // Origin only, e.g. https://example.de: paths are appended to it.
  APP_URL: z
    .string()
    .url()
    .refine(
      (value) => new URL(value).origin === value,
      "must be an origin without path or trailing slash",
    ),
  BETTER_AUTH_SECRET: z.string().min(32),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1).default("eu-central-1"),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: booleanString.default("true"),
  S3_BUCKET_ITEM_PHOTOS: z.string().min(1).default("item-photos"),
  S3_BUCKET_RECEIPTS: z.string().min(1).default("receipts"),

  // Domain of the receipt forwarding addresses, {alias}@RECEIPT_EMAIL_DOMAIN.
  RECEIPT_EMAIL_DOMAIN: z
    .string()
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, "must be a lower-case domain")
    .default("belege.kleiderschrank-kompakt.de"),
  // Shared secret the mail provider sends in x-inbound-secret. Without it,
  // POST /api/inbound/receipt refuses every request.
  INBOUND_SECRET: z.string().min(32).optional(),
  INBOUND_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),

  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1),
});

export type AppConfig = z.infer<typeof configSchema>;

// Reads <repo>/.env if present. Variables already set in the environment win.
export function loadConfig(): AppConfig {
  const envFile = path.join(repoRoot, ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    // Names and reasons only: the values may be secrets.
    const problems = parsed.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return parsed.data;
}
