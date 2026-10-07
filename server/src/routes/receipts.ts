import multipart from "@fastify/multipart";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { idSchema } from "@shared/common";
import { ITEM_PHOTO_MAX_BYTES } from "@shared/item";
import {
  RECEIPT_FILE_MAX_BYTES,
  RECEIPT_ITEMS_MAX,
  receiptItemsCreateSchema,
  type ForwardingAliasResponse,
  type ReceiptItemsResponse,
} from "@shared/receipt";

import type { AppConfig } from "../config";
import { detectImageType, detectReceiptType, type FileType } from "../lib/file-type";
import {
  sendBadRequest,
  sendError,
  sendNotFound,
  sendUnauthorized,
  sendUnsupportedMediaType,
} from "../lib/http-errors";
import { parseJsonField, readMultipart } from "../lib/multipart";
import { newRecordId, storageKey } from "../lib/storage-keys";
import { RelatedRecordNotFoundError } from "../repositories/errors";

const receiptParamsSchema = z.object({ id: idSchema });

type ReceiptsOptions = {
  config: Pick<AppConfig, "S3_BUCKET_ITEM_PHOTOS" | "S3_BUCKET_RECEIPTS">;
};

export const receiptsRoutes: FastifyPluginAsync<ReceiptsOptions> = async (app, { config }) => {
  // Encapsulated: only these routes accept multipart bodies. Per route limits
  // are checked again below.
  await app.register(multipart, {
    limits: {
      fileSize: Math.max(RECEIPT_FILE_MAX_BYTES, ITEM_PHOTO_MAX_BYTES),
      files: RECEIPT_ITEMS_MAX * 2,
      fields: 1,
      parts: RECEIPT_ITEMS_MAX * 2 + 1,
      fieldSize: 256 * 1024,
    },
  });

  app.get("/receipts/forwarding-alias", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const forwardingAlias = await app.repositories.forwardingAliases.getOrCreate(request.userId);
    if (forwardingAlias === null) return sendNotFound(reply);
    const body: ForwardingAliasResponse = { forwardingAlias };
    return body;
  });

  app.get("/receipts", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    return app.repositories.receipts.listSummaries(request.userId);
  });

  // multipart/form-data with one file "file": PDF, JPEG or PNG up to 10 MB.
  app.post("/receipts", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const userId = request.userId;
    if (!request.isMultipart()) {
      return sendUnsupportedMediaType(reply, "Expected multipart/form-data");
    }

    const body = await readMultipart(request);
    const file = body.files.get("file");
    if (body.invalid || body.files.size !== 1 || body.fields.size !== 0 || !file) {
      return sendBadRequest(reply, "Expected exactly one file named file");
    }
    // The plugin's limit is the larger of the photo and receipt limits.
    if (file.byteLength > RECEIPT_FILE_MAX_BYTES) {
      return sendError(reply, 413, "Payload Too Large", "request file too large");
    }
    const type = detectReceiptType(file);
    if (type === null) return sendUnsupportedMediaType(reply, "Only PDF, JPEG and PNG are allowed");

    const id = newRecordId();
    const fileKey = storageKey(userId, id, `beleg.${type.extension}`);
    try {
      await app.storage.putObject(config.S3_BUCKET_RECEIPTS, fileKey, file, type.contentType);
      const receipt = await app.repositories.receipts.create(userId, {
        id,
        fileKey,
        source: "UPLOAD",
        parseStatus: "MANUAL",
      });
      return await reply.code(201).send(receipt);
    } catch (error) {
      await app.storage.deletePrefix(config.S3_BUCKET_RECEIPTS, `${userId}/${id}/`).catch(() => {});
      throw error;
    }
  });

  // multipart/form-data with the field "data" (JSON, receiptItemsCreateSchema)
  // and, per item i, optionally the files "photo-i" and "thumbnail-i".
  app.post("/receipts/:id/items", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const userId = request.userId;
    const params = receiptParamsSchema.safeParse(request.params);
    if (!params.success) return sendNotFound(reply);
    if (!request.isMultipart()) {
      return sendUnsupportedMediaType(reply, "Expected multipart/form-data");
    }

    const body = await readMultipart(request);
    const data = receiptItemsCreateSchema.safeParse(parseJsonField(body.fields.get("data")));
    if (body.invalid || body.fields.size !== 1 || !data.success) {
      return sendBadRequest(reply, "Invalid receipt items");
    }

    // Each item has both files or none, and no file belongs to a missing item.
    const items = data.data.items;
    const expectedFiles = new Set(
      items.flatMap((_, index) => [`photo-${index}`, `thumbnail-${index}`]),
    );
    const unknownFile = [...body.files.keys()].some((name) => !expectedFiles.has(name));
    const halfPair = items.some(
      (_, index) => body.files.has(`photo-${index}`) !== body.files.has(`thumbnail-${index}`),
    );
    if (unknownFile || halfPair) return sendBadRequest(reply, "Unexpected or incomplete photos");

    const fileTypes = new Map<string, FileType>();
    for (const [name, content] of body.files) {
      const type = detectImageType(content);
      if (type === null) return sendUnsupportedMediaType(reply, "Only WebP, JPEG and PNG photos");
      fileTypes.set(name, type);
    }

    // Before anything is stored: another user's receipt does not exist.
    if ((await app.repositories.receipts.get(userId, params.data.id)) === null) {
      return sendNotFound(reply);
    }

    const bucket = config.S3_BUCKET_ITEM_PHOTOS;
    const newItems = items.map((item) => ({ ...item, id: newRecordId() }));
    try {
      const withPhotos = await Promise.all(
        newItems.map(async (item, index) => {
          const photo = body.files.get(`photo-${index}`);
          const thumbnail = body.files.get(`thumbnail-${index}`);
          const photoType = fileTypes.get(`photo-${index}`);
          const thumbnailType = fileTypes.get(`thumbnail-${index}`);
          if (!photo || !thumbnail || !photoType || !thumbnailType) return item;

          const photoKey = storageKey(userId, item.id, `photo.${photoType.extension}`);
          const thumbnailKey = storageKey(userId, item.id, `thumbnail.${thumbnailType.extension}`);
          await app.storage.putObject(bucket, photoKey, photo, photoType.contentType);
          await app.storage.putObject(bucket, thumbnailKey, thumbnail, thumbnailType.contentType);
          return { ...item, photoKey, thumbnailKey };
        }),
      );

      const created = await app.repositories.items.createForReceipt(
        userId,
        params.data.id,
        { merchant: data.data.merchant, purchaseDate: data.data.purchaseDate },
        withPhotos,
      );
      const response: ReceiptItemsResponse = { items: created };
      return await reply.code(201).send(response);
    } catch (error) {
      // The transaction stored no item; remove the photos stored for them.
      await Promise.allSettled(
        newItems.map((item) => app.storage.deletePrefix(bucket, `${userId}/${item.id}/`)),
      );
      if (error instanceof RelatedRecordNotFoundError) return sendNotFound(reply);
      throw error;
    }
  });
};
