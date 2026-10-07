import type { FastifyReply } from "fastify";

import type { ApiError } from "@shared/api-error";

// Same shape as Fastify's own error responses, so clients parse one format.
function sendError(reply: FastifyReply, statusCode: number, error: string, message: string) {
  const body: ApiError = { statusCode, error, message };
  return reply.code(statusCode).send(body);
}

export function sendUnauthorized(reply: FastifyReply) {
  return sendError(reply, 401, "Unauthorized", "Authentication required");
}

export function sendNotFound(reply: FastifyReply) {
  return sendError(reply, 404, "Not Found", "Not found");
}