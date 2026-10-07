import fastifyStatic from "@fastify/static";
import fp from "fastify-plugin";
import path from "node:path";

import type { Frontend } from "../lib/frontend";
import { sendNotFound } from "../lib/http-errors";

// Serves the built frontend from the same origin as the API. Paths that match
// neither a file nor an API route get the SPA shell, so client-side routes
// survive a reload.
export const frontendPlugin = fp<{ frontend: Frontend }>(async (app, { frontend }) => {
  await app.register(fastifyStatic, {
    root: frontend.dir,
    wildcard: false,
    index: false,
    setHeaders(response, filePath) {
      // Vite fingerprints everything under /assets, so those files never change.
      const immutable = filePath.split(path.sep).includes("assets");
      response.setHeader(
        "Cache-Control",
        immutable ? "public, max-age=31536000, immutable" : "no-cache",
      );
    },
  });

  app.setNotFoundHandler((request, reply) => {
    const pathname = request.url.split("?")[0] ?? "";
    const isPageRequest =
      (request.method === "GET" || request.method === "HEAD") &&
      !pathname.startsWith("/api/") &&
      pathname !== "/api" &&
      path.extname(pathname) === "";

    if (!isPageRequest) return sendNotFound(reply);
    return reply
      .header("Cache-Control", "no-cache")
      .type("text/html; charset=utf-8")
      .send(frontend.shellHtml);
  });
});