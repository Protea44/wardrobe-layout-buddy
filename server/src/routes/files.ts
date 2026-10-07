import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import type { AppConfig } from "../config";
import { sendNotFound, sendUnauthorized } from "../lib/http-errors";

const paramsSchema = z.object({
  bucket: z.enum(["item-photos", "receipts"]),
  "*": z.string().min(1),
});

// Object keys are "<userId>/...". Anything else belongs to someone else.
export function isOwnedKey(key: string, userId: string) {
  return userId !== "" && key.startsWith(`${userId}/`) && !key.split("/").includes("..");
}

type FilesOptions = {
  config: Pick<AppConfig, "S3_BUCKET_ITEM_PHOTOS" | "S3_BUCKET_RECEIPTS">;
};

export const filesRoutes: FastifyPluginAsync<FilesOptions> = async (app, { config }) => {
  const buckets = {
    "item-photos": config.S3_BUCKET_ITEM_PHOTOS,
    receipts: config.S3_BUCKET_RECEIPTS,
  };

  app.get("/files/:bucket/*", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);

    const params = paramsSchema.safeParse(request.params);
    // Foreign and missing files look the same, so a key's existence never leaks.
    if (!params.success || !isOwnedKey(params.data["*"], request.userId)) {
      return sendNotFound(reply);
    }

    const object = await app.storage.getObjectStream(
      buckets[params.data.bucket],
      params.data["*"],
    );
    if (object === null) return sendNotFound(reply);

    reply
      .header("Cache-Control", "private, max-age=300")
      // Uploaded content must never run as a document on our origin.
      .header("Content-Security-Policy", "default-src 'none'; sandbox")
      .type(object.contentType ?? "application/octet-stream");
    if (object.contentLength !== undefined) reply.header("Content-Length", object.contentLength);
    return reply.send(object.stream);
  });
};