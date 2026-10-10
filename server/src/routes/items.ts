import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";

import { ITEM_PHOTO_MAX_BYTES, itemUploadSchema } from "@shared/item";

import type { AppConfig } from "../config";
import { detectImageType } from "../lib/image-type";
import { sendBadRequest, sendError, sendNotFound, sendUnauthorized } from "../lib/http-errors";
import { newRecordId, storageKey } from "../lib/storage-keys";
import { RelatedRecordNotFoundError } from "../repositories/errors";

const FILE_FIELDS = ["photo", "thumbnail"] as const;
type FileField = (typeof FILE_FIELDS)[number];

const isFileField = (name: string): name is FileField =>
  (FILE_FIELDS as readonly string[]).includes(name);

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

type ItemsOptions = {
  config: Pick<AppConfig, "S3_BUCKET_ITEM_PHOTOS">;
};

export const itemsRoutes: FastifyPluginAsync<ItemsOptions> = async (app, { config }) => {
  const bucket = config.S3_BUCKET_ITEM_PHOTOS;

  // Encapsulated: only these routes accept multipart bodies.
  await app.register(multipart, {
    // A few spare fields, so unexpected ones are answered with 400 below
    // instead of the plugin's 413. Files stay limited to the two expected.
    limits: { fileSize: ITEM_PHOTO_MAX_BYTES, files: 2, fields: 4, parts: 6, fieldSize: 64 * 1024 },
  });

  // multipart/form-data with the files "photo" and "thumbnail" and the field
  // "data" (JSON, itemUploadSchema). The new item is always private.
  app.post("/items", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const userId = request.userId;
    if (!request.isMultipart()) {
      return sendError(reply, 415, "Unsupported Media Type", "Expected multipart/form-data");
    }

    const files: Partial<Record<FileField, Buffer>> = {};
    let data: string | undefined;
    let unexpectedPart = false;
    // Reads every part, so the request body is always consumed before answering.
    // Files above the size limit throw a 413 here.
    for await (const part of request.parts()) {
      if (part.type === "file") {
        const content = await part.toBuffer();
        if (isFileField(part.fieldname) && files[part.fieldname] === undefined) {
          files[part.fieldname] = content;
        } else {
          unexpectedPart = true;
        }
      } else if (part.fieldname === "data" && typeof part.value === "string") {
        data = part.valueTruncated ? undefined : part.value;
      } else {
        unexpectedPart = true;
      }
    }

    const { photo, thumbnail } = files;
    if (unexpectedPart || photo === undefined || thumbnail === undefined || data === undefined) {
      return sendBadRequest(reply, "Expected the files photo and thumbnail and the field data");
    }
    const fields = itemUploadSchema.safeParse(parseJson(data));
    if (!fields.success) return sendBadRequest(reply, "Invalid item fields");

    const photoType = detectImageType(photo);
    const thumbnailType = detectImageType(thumbnail);
    if (photoType === null || thumbnailType === null) {
      return sendError(reply, 415, "Unsupported Media Type", "Only WebP, JPEG and PNG are allowed");
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
