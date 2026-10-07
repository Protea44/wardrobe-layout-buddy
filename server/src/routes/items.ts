import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { idSchema } from "@shared/common";
import {
  ITEM_PHOTO_MAX_BYTES,
  itemEditSchema,
  itemListQuerySchema,
  itemUploadSchema,
} from "@shared/item";

import type { AppConfig } from "../config";
import { detectImageType, type FileType } from "../lib/file-type";
import {
  sendBadRequest,
  sendNotFound,
  sendUnauthorized,
  sendUnsupportedMediaType,
} from "../lib/http-errors";
import { parseJsonField, readMultipart, type MultipartBody } from "../lib/multipart";
import { newRecordId, storageKey } from "../lib/storage-keys";
import { isUniqueViolation, RelatedRecordNotFoundError } from "../repositories/errors";
import { InvalidCursorError } from "../repositories/item-search";

const itemParamsSchema = z.object({ id: idSchema });

type PhotoFile = { content: Buffer; type: FileType };
type PhotoPair = { photo: PhotoFile; thumbnail: PhotoFile };

// The files "photo" and "thumbnail" of a multipart body: "missing" if one is
// absent, "type" if one is not really WebP, JPEG or PNG.
function photoPair(body: MultipartBody): PhotoPair | "missing" | "type" {
  const photo = body.files.get("photo");
  const thumbnail = body.files.get("thumbnail");
  if (body.invalid || body.files.size !== 2 || !photo || !thumbnail) return "missing";
  const photoType = detectImageType(photo);
  const thumbnailType = detectImageType(thumbnail);
  if (photoType === null || thumbnailType === null) return "type";
  return {
    photo: { content: photo, type: photoType },
    thumbnail: { content: thumbnail, type: thumbnailType },
  };
}

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
    const data = body.fields.get("data");
    const pair = photoPair(body);
    if (pair === "missing" || body.fields.size !== 1 || data === undefined) {
      return sendBadRequest(reply, "Expected the files photo and thumbnail and the field data");
    }
    const fields = itemUploadSchema.safeParse(parseJsonField(data));
    if (!fields.success) return sendBadRequest(reply, "Invalid item fields");
    if (pair === "type") {
      return sendUnsupportedMediaType(reply, "Only WebP, JPEG and PNG are allowed");
    }

    // A retry of a create that already worked returns the stored item.
    const clientId = fields.data.id;
    if (clientId !== undefined) {
      const existing = await app.repositories.items.get(userId, clientId);
      if (existing !== null) return existing;
      if (await app.repositories.items.isIdTakenByOtherUser(userId, clientId)) {
        return sendNotFound(reply);
      }
    }

    const id = clientId ?? newRecordId();
    const photoKey = storageKey(userId, id, `photo.${pair.photo.type.extension}`);
    const thumbnailKey = storageKey(userId, id, `thumbnail.${pair.thumbnail.type.extension}`);

    try {
      await app.storage.putObject(
        bucket,
        photoKey,
        pair.photo.content,
        pair.photo.type.contentType,
      );
      await app.storage.putObject(
        bucket,
        thumbnailKey,
        pair.thumbnail.content,
        pair.thumbnail.type.contentType,
      );
      await app.repositories.items.create(userId, fields.data, id);
      const item = await app.repositories.items.setPhoto(userId, id, { photoKey, thumbnailKey });
      if (item === null) throw new Error("Item vanished right after it was created");
      return await reply.code(201).send(item);
    } catch (error) {
      // A parallel retry with the same id won: its item and files stay.
      if (clientId !== undefined && isUniqueViolation(error)) {
        const existing = await app.repositories.items.get(userId, clientId);
        return existing ?? sendNotFound(reply);
      }
      // Leave neither orphaned files nor an item without its photo behind.
      await Promise.allSettled([
        app.storage.deletePrefix(bucket, `${userId}/${id}/`),
        app.repositories.items.delete(userId, id),
      ]);
      if (error instanceof RelatedRecordNotFoundError) return sendNotFound(reply);
      throw error;
    }
  });

  // JSON body (itemEditSchema): only the fields sent change, null clears one.
  app.patch("/items/:id", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const params = itemParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);
    const input = itemEditSchema.safeParse(request.body);
    if (!input.success) return sendBadRequest(reply, "Invalid item fields");

    try {
      const item = await app.repositories.items.update(request.userId, params.data.id, input.data);
      return item ?? sendNotFound(reply);
    } catch (error) {
      if (error instanceof RelatedRecordNotFoundError) return sendNotFound(reply);
      throw error;
    }
  });

  // Removes the item, its outfit links (by cascade) and its files.
  app.delete("/items/:id", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const userId = request.userId;
    const params = itemParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);

    if (!(await app.repositories.items.delete(userId, params.data.id))) return sendNotFound(reply);
    try {
      await app.storage.deletePrefix(bucket, `${userId}/${params.data.id}/`);
    } catch {
      // The item is gone either way; leftover files are only reachable by their owner.
      request.log.error("Deleting the files of a removed item failed");
    }
    return reply.code(204).send();
  });

  // multipart/form-data with the files "photo" and "thumbnail". New file names
  // on every replacement, so no cached copy of the old photo is ever shown.
  app.put("/items/:id/photo", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const userId = request.userId;
    const params = itemParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);
    if (!request.isMultipart()) {
      return sendUnsupportedMediaType(reply, "Expected multipart/form-data");
    }

    const body = await readMultipart(request);
    const pair = photoPair(body);
    if (pair === "missing" || body.fields.size !== 0) {
      return sendBadRequest(reply, "Expected the files photo and thumbnail");
    }
    if (pair === "type") {
      return sendUnsupportedMediaType(reply, "Only WebP, JPEG and PNG are allowed");
    }

    const id = params.data.id;
    const existing = await app.repositories.items.get(userId, id);
    if (existing === null) return sendNotFound(reply);

    const version = randomUUID().slice(0, 8);
    const photoKey = storageKey(userId, id, `photo-${version}.${pair.photo.type.extension}`);
    const thumbnailKey = storageKey(
      userId,
      id,
      `thumbnail-${version}.${pair.thumbnail.type.extension}`,
    );
    let item;
    try {
      await app.storage.putObject(
        bucket,
        photoKey,
        pair.photo.content,
        pair.photo.type.contentType,
      );
      await app.storage.putObject(
        bucket,
        thumbnailKey,
        pair.thumbnail.content,
        pair.thumbnail.type.contentType,
      );
      item = await app.repositories.items.setPhoto(userId, id, { photoKey, thumbnailKey });
    } catch (error) {
      await Promise.allSettled([
        app.storage.deleteObject(bucket, photoKey),
        app.storage.deleteObject(bucket, thumbnailKey),
      ]);
      throw error;
    }
    // Deleted between the check and the update.
    if (item === null) {
      await app.storage.deletePrefix(bucket, `${userId}/${id}/`).catch(() => {});
      return sendNotFound(reply);
    }

    const oldKeys = [existing.photoKey, existing.thumbnailKey].filter(
      (key): key is string => key !== null,
    );
    const removed = await Promise.allSettled(
      oldKeys.map((key) => app.storage.deleteObject(bucket, key)),
    );
    if (removed.some((result) => result.status === "rejected")) {
      request.log.error("Deleting a replaced item photo failed");
    }
    return item;
  });
};
