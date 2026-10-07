import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { idSchema } from "@shared/common";
import { ITEM_PHOTO_MAX_BYTES, itemListQuerySchema, itemUploadSchema } from "@shared/item";

import type { AppConfig } from "../config";
import { detectImageType } from "../lib/file-type";
import {
  sendBadRequest,
  sendNotFound,
  sendUnauthorized,
  sendUnsupportedMediaType,
} from "../lib/http-errors";
import { parseJsonField, readMultipart } from "../lib/multipart";
import { newRecordId, storageKey } from "../lib/storage-keys";
import { RelatedRecordNotFoundError } from "../repositories/errors";
import { InvalidCursorError } from "../repositories/item-search";

const itemParamsSchema = z.object({ id: idSchema });

type ItemsOptions = {
  config: Pick<AppConfig, "S3_BUCKET_ITEM_PHOTOS">;
};

export const itemsRoutes: FastifyPluginAsync<ItemsOptions> = async (app, { config }) => {
  const bucket = config.S3_BUCKET_ITEM_PHOTOS;

  // Encapsulated: only these routes accept multipart bodies.
  await app.register(multipart, {
    limits: { fileSize: ITEM_PHOTO_MAX_BYTES, files: 2, fields: 1, parts: 3, fieldSize: 64 * 1024 },
  });

  // One page of the user's active items, filtered, searched and sorted.
  app.get("/items", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const query = itemListQuerySchema.safeParse(request.query);
    if (!query.success) return sendBadRequest(reply, "Invalid list parameters");

    try {
      return await app.repositories.items.search(request.userId, query.data);
    } catch (error) {
      if (error instanceof InvalidCursorError) return sendBadRequest(reply, "Invalid cursor");
      throw error;
    }
  });

  app.get("/items/facets", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    return app.repositories.items.facets(request.userId);
  });

  app.get("/items/:id", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const params = itemParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);
    const item = await app.repositories.items.get(request.userId, params.data.id);
    return item ?? sendNotFound(reply);
  });

  // multipart/form-data with the files "photo" and "thumbnail" and the field
  // "data" (JSON, itemUploadSchema). The new item is always private.
  app.post("/items", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const userId = request.userId;
    if (!request.isMultipart()) {
      return sendUnsupportedMediaType(reply, "Expected multipart/form-data");
    }

    const body = await readMultipart(request);
    const photo = body.files.get("photo");
    const thumbnail = body.files.get("thumbnail");
    const data = body.fields.get("data");
    const expectedParts = body.files.size === 2 && body.fields.size === 1;
    if (body.invalid || !expectedParts || !photo || !thumbnail || data === undefined) {
      return sendBadRequest(reply, "Expected the files photo and thumbnail and the field data");
    }
    const fields = itemUploadSchema.safeParse(parseJsonField(data));
    if (!fields.success) return sendBadRequest(reply, "Invalid item fields");

    const photoType = detectImageType(photo);
    const thumbnailType = detectImageType(thumbnail);
    if (photoType === null || thumbnailType === null) {
      return sendUnsupportedMediaType(reply, "Only WebP, JPEG and PNG are allowed");
    }

    const id = newRecordId();
    const photoKey = storageKey(userId, id, `photo.${photoType.extension}`);
    const thumbnailKey = storageKey(userId, id, `thumbnail.${thumbnailType.extension}`);

    try {
      await app.storage.putObject(bucket, photoKey, photo, photoType.contentType);
      await app.storage.putObject(bucket, thumbnailKey, thumbnail, thumbnailType.contentType);
      await app.repositories.items.create(userId, fields.data, id);
      const item = await app.repositories.items.setPhoto(userId, id, { photoKey, thumbnailKey });
      if (item === null) throw new Error("Item vanished right after it was created");
      return await reply.code(201).send(item);
    } catch (error) {
      // Leave neither orphaned files nor an item without its photo behind.
      await Promise.allSettled([
        app.storage.deletePrefix(bucket, `${userId}/${id}/`),
        app.repositories.items.delete(userId, id),
      ]);
      if (error instanceof RelatedRecordNotFoundError) return sendNotFound(reply);
      throw error;
    }
  });
};
