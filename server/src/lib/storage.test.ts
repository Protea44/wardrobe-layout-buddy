import { randomUUID } from "node:crypto";
import { text } from "node:stream/consumers";
import { afterAll, describe, expect, it } from "vitest";

import { loadConfig } from "../config";
import { createStorage } from "./storage";

// Runs against the local storage service from docker-compose.yml. Everything
// lives under a throwaway prefix that is removed again afterwards.
describe("storage", () => {
  const config = loadConfig();
  const storage = createStorage(config);
  const bucket = config.S3_BUCKET_ITEM_PHOTOS;
  const prefix = `test-${randomUUID()}/`;

  afterAll(() => storage.deletePrefix(bucket, prefix));

  it("stores an object and streams it back", async () => {
    await storage.putObject(bucket, `${prefix}a.txt`, Buffer.from("hello"), "text/plain");

    const object = await storage.getObjectStream(bucket, `${prefix}a.txt`);

    expect(object).not.toBeNull();
    expect(object?.contentType).toBe("text/plain");
    expect(object?.contentLength).toBe(5);
    expect(object && (await text(object.stream))).toBe("hello");
  });

  it("returns null for a missing object", async () => {
    expect(await storage.getObjectStream(bucket, `${prefix}missing.txt`)).toBeNull();
  });

  it("deletes a single object", async () => {
    await storage.putObject(bucket, `${prefix}b.txt`, Buffer.from("x"), "text/plain");

    await storage.deleteObject(bucket, `${prefix}b.txt`);

    expect(await storage.getObjectStream(bucket, `${prefix}b.txt`)).toBeNull();
  });

  it("deletes everything below a prefix and nothing else", async () => {
    await storage.putObject(bucket, `${prefix}dir/1.txt`, Buffer.from("1"), "text/plain");
    await storage.putObject(bucket, `${prefix}dir/2.txt`, Buffer.from("2"), "text/plain");
    await storage.putObject(bucket, `${prefix}keep.txt`, Buffer.from("k"), "text/plain");

    await storage.deletePrefix(bucket, `${prefix}dir/`);

    expect(await storage.getObjectStream(bucket, `${prefix}dir/1.txt`)).toBeNull();
    expect(await storage.getObjectStream(bucket, `${prefix}dir/2.txt`)).toBeNull();
    const kept = await storage.getObjectStream(bucket, `${prefix}keep.txt`);
    expect(kept).not.toBeNull();
    kept?.stream.destroy();
  });

  it("refuses an empty prefix", async () => {
    await expect(storage.deletePrefix(bucket, "")).rejects.toThrow(/non-empty prefix/);
  });
});
