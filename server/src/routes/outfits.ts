import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { idSchema } from "@shared/common";
import { outfitSaveSchema } from "@shared/outfit";

import { sendBadRequest, sendNotFound, sendUnauthorized } from "../lib/http-errors";
import { RelatedRecordNotFoundError } from "../repositories/errors";

const outfitParamsSchema = z.object({ id: idSchema });

export const outfitsRoutes: FastifyPluginAsync = async (app) => {
  app.get("/outfits", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    return app.repositories.outfits.list(request.userId);
  });

  // Body: outfitSaveSchema. Every item must belong to the user, otherwise 404.
  app.post("/outfits", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const input = outfitSaveSchema.safeParse(request.body);
    if (!input.success) return sendBadRequest(reply, "Invalid outfit");

    try {
      const outfit = await app.repositories.outfits.createWithItems(request.userId, input.data);
      return await reply.code(201).send(outfit);
    } catch (error) {
      if (error instanceof RelatedRecordNotFoundError) return sendNotFound(reply);
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
