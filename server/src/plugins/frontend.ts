import fastifyStatic from "@fastify/static";
import type { FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import path from "node:path";

import type { Frontend } from "../lib/frontend";
import { sendNotFound } from "../lib/http-errors";

function isPageRequest(request: FastifyRequest) {
  const pathname = request.url.split("?")[0] ?? "";
  return (
    (request.method === "GET" || request.method === "HEAD") &&
    !pathname.startsWith("/api/") &&
    pathname !== "/api" &&
    path.extname(pathname) === ""
  );
}

// In production, serves the built frontend from the same origin as the API.
// Paths that match neither a file nor an API route get the SPA shell, so
// client-side routes survive a reload. Without a frontend (development, tests)
// only the JSON 404 remains.
export const frontendPlugin = fp<{ frontend: Frontend | null }>(async (app, { frontend }) => {
  if (frontend) {
    await app.register(fastifyStatic, {
      root: frontend.dir,
      wildcard: false,
      index: false,
      setHeaders(response, filePath) {
        // Vite fingerprints everything under /assets, so those files never change.
        const immutable = filePath.split(path.sep).includes("assets");
        response.header(
          "Cache-Control",
          immutable ? "public, max-age=31536000, immutable" : "no-cache",
        );
      },
    });
  }

  // Replaces Fastify's default handler, which logs the full URL including the query string.
  app.setNotFoundHandler((request, reply) => {
    if (!frontend || !isPageRequest(request)) return sendNotFound(reply);
    return reply
      .header("Cache-Control", "no-cache")
      .type("text/html; charset=utf-8")
      .send(frontend.shellHtml);
  });
});
