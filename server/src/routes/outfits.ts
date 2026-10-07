import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { idSchema } from "@shared/common";
import { outfitCreateBodySchema, outfitSaveSchema } from "@shared/outfit";

import { sendBadRequest, sendNotFound, sendUnauthorized } from "../lib/http-errors";
import { isUniqueViolation, RelatedRecordNotFoundError } from "../repositories/errors";

const outfitParamsSchema = z.object({ id: idSchema });

export const outfitsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/outfits", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    return app.repositories.outfits.list(request.userId);
  });

  // Body: outfitCreateBodySchema. Every item must belong to the user,
  // otherwise 404. With a client id, a retry returns the outfit created first.
  app.post("/outfits", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const userId = request.userId;
    const body = outfitCreateBodySchema.safeParse(request.body);
    if (!body.success) return sendBadRequest(reply, "Invalid outfit");
    const { id, ...input } = body.data;

    if (id !== undefined) {
      const existing = await app.repositories.outfits.get(userId, id);
      if (existing !== null) return existing;
      if (await app.repositories.outfits.isIdTakenByOtherUser(userId, id)) {
        return sendNotFound(reply);
      }
    }

    try {
      const outfit = await app.repositories.outfits.createWithItems(userId, input, id);
      return await reply.code(201).send(outfit);
    } catch (error) {
      if (error instanceof RelatedRecordNotFoundError) return sendNotFound(reply);
      if (id !== undefined && isUniqueViolation(error)) {
        const existing = await app.repositories.outfits.get(userId, id);
        return existing ?? sendNotFound(reply);
      }
      throw error;
    }
  });

  app.get("/outfits/:id", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const params = outfitParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);
    const outfit = await app.repositories.outfits.get(request.userId, params.data.id);
    return outfit ?? sendNotFound(reply);
  });

  // Replaces name, occasion and all placements in one transaction.
  app.put("/outfits/:id", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const params = outfitParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);
    const input = outfitSaveSchema.safeParse(request.body);
    if (!input.success) return sendBadRequest(reply, "Invalid outfit");

    try {
      const outfit = await app.repositories.outfits.replace(
        request.userId,
        params.data.id,
        input.data,
      );
      return outfit ?? sendNotFound(reply);
    } catch (error) {
      if (error instanceof RelatedRecordNotFoundError) return sendNotFound(reply);
      throw error;
    }
  });

  // The items stay; only the outfit and its placements go.
  app.delete("/outfits/:id", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const params = outfitParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);
    const deleted = await app.repositories.outfits.delete(request.userId, params.data.id);
    return deleted ? reply.code(204).send() : sendNotFound(reply);
  });
};
