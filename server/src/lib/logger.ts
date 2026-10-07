import type { FastifyServerOptions } from "fastify";

import type { AppConfig } from "../config";

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
        url: request.url.split("?")[0] ?? "",
      }),
    },
    ...(stream !== undefined && { stream }),
  };
}
