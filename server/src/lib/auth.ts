import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { FastifyBaseLogger } from "fastify";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@shared/auth";

import type { AppConfig } from "../config";
import type { PrismaClient } from "../generated/prisma/client";
import type { Mailer } from "./mailer";

type AuthDependencies = {
  config: Pick<AppConfig, "APP_URL" | "BETTER_AUTH_SECRET" | "NODE_ENV">;
  prisma: PrismaClient;
  mailer: Mailer;
  log: FastifyBaseLogger;
};

export const AUTH_BASE_PATH = "/api/auth";
export const RESET_PASSWORD_PATH = "/passwort-zuruecksetzen";

export function createAuth({ config, prisma, mailer, log }: AuthDependencies) {
  return betterAuth({
    baseURL: config.APP_URL,
    basePath: AUTH_BASE_PATH,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [config.APP_URL],
    database: prismaAdapter(prisma, { provider: "postgresql" }),

    emailAndPassword: {
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
      maxPasswordLength: PASSWORD_MAX_LENGTH,
      // A reset is proof that the password was lost or leaked: end all other sessions.
      revokeSessionsOnPasswordReset: true,
      // One hour; the e-mail text says so.
      resetPasswordTokenExpiresIn: 60 * 60,
      sendResetPassword: async ({ user, token }) => {
        const link = `${config.APP_URL}${RESET_PASSWORD_PATH}?token=${encodeURIComponent(token)}`;
        // Not awaited, so the response time does not reveal whether the address has an account.
        void mailer
          .send({
            to: user.email,
            subject: "Passwort zurücksetzen – Kleiderschrank Kompakt",
            text: [
              `Hallo ${user.name},`,
              "",
              "du hast angefordert, dein Passwort für Kleiderschrank Kompakt zurückzusetzen.",
              "Über diesen Link kannst du ein neues Passwort festlegen:",
              "",
              link,
              "",
              "Der Link ist eine Stunde gültig. Wenn du das nicht warst, kannst du diese E-Mail ignorieren; dein Passwort bleibt unverändert.",
            ].join("\n"),
          })
          .catch(() => {
            // Neither the address nor the mail content belongs in the log.
            log.error("Sending the password reset e-mail failed");
          });
      },
    },

    // Request limits are enforced by @fastify/rate-limit, see routes/auth.ts.
    rateLimit: { enabled: false },

    advanced: {
      cookiePrefix: "kk",
      // Session cookies are always Secure in production, whatever APP_URL says.
      // (Better Auth sets HttpOnly and SameSite=Lax itself.)
      useSecureCookies: config.NODE_ENV === "production",
      // Explicit, because Better Auth otherwise switches the origin check off
      // under NODE_ENV=test and the tests would not cover what production runs.
      disableOriginCheck: false,
      // Sessions are stored without the client's IP address.
      ipAddress: { disableIpTracking: true },
    },

    logger: {
      level: "error",
      // Messages only: the extra arguments can contain e-mail addresses.
      log: (level, message) => {
        log[level](message);
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
