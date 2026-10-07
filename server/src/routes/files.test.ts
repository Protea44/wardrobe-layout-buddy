import { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Storage } from "../lib/storage";
import {
  browserHeaders,
  buildTestApp,
  resetDatabase,
  signUp,
  type TestApp,
} from "../test/build-test-app";
import { isOwnedKey } from "./files";

describe("GET /api/files/:bucket/*", () => {
  let app: TestApp;
  let owner: { userId: string; cookie: string };
  let other: { userId: string; cookie: string };
  const requested: string[] = [];

  // One stored photo that belongs to the owner.
  const storage: Storage = {
    putObject: () => Promise.resolve(),
    deleteObject: () => Promise.resolve(),
    deletePrefix: () => Promise.resolve(),
    getObjectStream: (bucket, key) => {
      requested.push(`${bucket}/${key}`);
      if (bucket !== "item-photos" || key !== `${owner.userId}/photo.jpg`) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        stream: Readable.from([Buffer.from("jpeg-bytes")]),
        contentType: "image/jpeg",
        contentLength: 10,
      });
    },
  };

  beforeAll(async () => {
    app = await buildTestApp({ storage });
    await resetDatabase(app);
    owner = await signUp(app, "owner@example.test");
    other = await signUp(app, "other@example.test");
  });
  afterAll(() => app.close());

  function get(url: string, cookie?: string) {
    requested.length = 0;
    return app.inject({ method: "GET", url, headers: browserHeaders(app, cookie) });
  }

  it("requires a session", async () => {
    const response = await get(`/api/files/item-photos/${owner.userId}/photo.jpg`);

    expect(response.statusCode).toBe(401);
    expect(requested).toEqual([]);
  });

  it("treats an invalid session cookie as no session", async () => {
    const response = await get(
      `/api/files/item-photos/${owner.userId}/photo.jpg`,
      "kk.session_token=forged.value",
    );

    expect(response.statusCode).toBe(401);
    expect(requested).toEqual([]);
  });

  it("streams the owner's file with a private cache header", async () => {
    const response = await get(`/api/files/item-photos/${owner.userId}/photo.jpg`, owner.cookie);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("jpeg-bytes");
    expect(response.headers["content-type"]).toBe("image/jpeg");
    expect(response.headers["cache-control"]).toBe("private, max-age=300");
    expect(response.headers["content-security-policy"]).toBe("default-src 'none'; sandbox");
  });

  it("answers 404 for another user's file without touching storage", async () => {
    const response = await get(`/api/files/item-photos/${owner.userId}/photo.jpg`, other.cookie);

    expect(response.statusCode).toBe(404);
    expect(requested).toEqual([]);
  });

  it("answers 404 for a missing file, an unknown bucket and path traversal", async () => {
    for (const url of [
      `/api/files/item-photos/${owner.userId}/missing.jpg`,
      `/api/files/other-bucket/${owner.userId}/photo.jpg`,
      `/api/files/item-photos/${other.userId}/%2E%2E/${owner.userId}/photo.jpg`,
    ]) {
      const response = await get(url, other.cookie);
      expect(response.statusCode, url).toBe(404);
    }
  });
});

describe("isOwnedKey", () => {
  it("accepts only keys below the user's own prefix", () => {
    expect(isOwnedKey("user-a/photo.jpg", "user-a")).toBe(true);
    expect(isOwnedKey("user-ab/photo.jpg", "user-a")).toBe(false);
    expect(isOwnedKey("user-b/photo.jpg", "user-a")).toBe(false);
    expect(isOwnedKey("user-a/../user-b/photo.jpg", "user-a")).toBe(false);
    expect(isOwnedKey("/photo.jpg", "")).toBe(false);
  });
});
