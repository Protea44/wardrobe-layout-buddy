import type { FastifyServerOptions } from "fastify";

import type { AppConfig } from "../config";

// Path without query string, with ids masked: user, item and outfit ids
// (e.g. in /api/files/item-photos/{userId}/...) point to a person.
export function loggablePath(url: string) {
  // Long segments with a digit or capital letter; route names are lower-case words.
  return (url.split("?")[0] ?? "").replace(
    /\/(?=[A-Za-z0-9_-]*[A-Z0-9])[A-Za-z0-9_-]{16,}(?=\/|$)/g,
    "/:id",
  );
}

// Request logs carry only method and path. Bodies are never logged; headers,
// query strings and client addresses are left out because they can hold
// credentials or personal data. The redact list is a second line of defence
// for code that logs a request or reply object by hand.
export function loggerOptions(
  config: Pick<AppConfig, "LOG_LEVEL">,
  stream?: NodeJS.WritableStream,
): NonNullable<FastifyServerOptions["logger"]> {
  return {
    level: config.LOG_LEVEL,
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        'res.headers["set-cookie"]',
        "headers.authorization",
        "headers.cookie",
        "body",
        "req.body",
      ],
      remove: true,
    },
    serializers: {
      req: (request: { method: string; url: string }) => ({
        method: request.method,
        url: loggablePath(request.url),
      }),
    },
    ...(stream !== undefined && { stream }),
  };
}
