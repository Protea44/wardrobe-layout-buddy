import { Readable } from "node:stream";

import type { Storage } from "../lib/storage";

// Keeps objects in memory, so tests can look at what was stored.
export function createMemoryStorage() {
  const objects = new Map<string, { body: Uint8Array; contentType: string }>();
  const storage: Storage = {
    putObject: (bucket, key, body, contentType) => {
      objects.set(`${bucket}/${key}`, { body, contentType });
      return Promise.resolve();
    },
    getObjectStream: (bucket, key) => {
      const object = objects.get(`${bucket}/${key}`);
      if (!object) return Promise.resolve(null);
      return Promise.resolve({
        stream: Readable.from([Buffer.from(object.body)]),
        contentType: object.contentType,
        contentLength: object.body.byteLength,
      });
    },
    deleteObject: (bucket, key) => {
      objects.delete(`${bucket}/${key}`);
      return Promise.resolve();
    },
    deletePrefix: (bucket, prefix) => {
      for (const key of objects.keys()) {
        if (key.startsWith(`${bucket}/${prefix}`)) objects.delete(key);
      }
      return Promise.resolve();
    },
  };
  return { storage, objects };
}
