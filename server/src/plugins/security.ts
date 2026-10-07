import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import fp from "fastify-plugin";

import type { AppConfig } from "../config";

type SecurityOptions = {
  config: Pick<AppConfig, "NODE_ENV" | "RATE_LIMIT_MAX">;
};

export const securityPlugin = fp<SecurityOptions>(async (app, { config }) => {
  const production = config.NODE_ENV === "production";

  await app.register(helmet, {
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        // Scripts stay limited to our own files. Styles additionally allow
        // inline <style> tags: the toast library (sonner) and the scroll lock
        // of dialogs (react-remove-scroll) insert theirs at runtime, the
        // latter with computed values, so neither hashes nor nonces fit.
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(production && { upgradeInsecureRequests: [] }),
      },
    },
    // Local development runs on plain http, where HSTS would be ignored anyway
    // and would stick to "localhost" once a browser saw it over https.
    hsts: production ? { maxAge: 31_536_000, includeSubDomains: true } : false,
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
  });
});
