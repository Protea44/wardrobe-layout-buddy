import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { Readable } from "node:stream";

import type { AppConfig } from "../config";

export type StoredObject = {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
};

export type Storage = {
  putObject(bucket: string, key: string, body: Uint8Array, contentType: string): Promise<void>;
  // Resolves to null when the object does not exist.
  getObjectStream(bucket: string, key: string): Promise<StoredObject | null>;
  deleteObject(bucket: string, key: string): Promise<void>;
  deletePrefix(bucket: string, prefix: string): Promise<void>;
};

type StorageConfig = Pick<
  AppConfig,
  "S3_ENDPOINT" | "S3_REGION" | "S3_ACCESS_KEY_ID" | "S3_SECRET_ACCESS_KEY" | "S3_FORCE_PATH_STYLE"
>;

export function createStorage(config: StorageConfig): Storage {
  const client = new S3Client({
    endpoint: config.S3_ENDPOINT,
    region: config.S3_REGION,
    forcePathStyle: config.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    },
  });

  return {
    async putObject(bucket, key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },

    async getObjectStream(bucket, key) {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!object.Body) return null;
        return {
          stream: object.Body as Readable,
          ...(object.ContentType !== undefined && { contentType: object.ContentType }),
          ...(object.ContentLength !== undefined && { contentLength: object.ContentLength }),
        };
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },

    async deleteObject(bucket, key) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    async deletePrefix(bucket, prefix) {
      // An empty prefix would match, and delete, the whole bucket.
      if (prefix === "") throw new Error("deletePrefix requires a non-empty prefix");

      let continuationToken: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );
        const objects = (page.Contents ?? []).flatMap(({ Key }) => (Key ? [{ Key }] : []));
        if (objects.length > 0) {
          const result = await client.send(
            new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: objects, Quiet: true } }),
          );
          if (result.Errors && result.Errors.length > 0) {
            throw new Error(`Failed to delete ${result.Errors.length} objects from ${bucket}`);
          }
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken !== undefined);
    },
  };
}