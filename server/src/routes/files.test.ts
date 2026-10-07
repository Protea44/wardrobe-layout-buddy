import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";

import type { Storage } from "../lib/storage";
import { buildTestApp } from "../test/build-test-app";
import { isOwnedKey } from "./files";

const OWNER = "user-a";
const OTHER = "user-b";

// One stored photo that belongs to OWNER.
function fakeStorage() {
  const requested: string[] = [];
  const storage: Storage = {
    putObject: () => Promise.resolve(),
    deleteObject: () => Promise.resolve(),
    deletePrefix: () => Promise.resolve(),
    getObjectStream: (bucket, key) => {
      requested.push(`${bucket}/${key}`);
      if (bucket !== "item-photos" || key !== `${OWNER}/photo.jpg`) return Promise.resolve(null);
      return Promise.resolve({
        stream: Readable.from([Buffer.from("jpeg-bytes")]),
        contentType: "image/jpeg",
        contentLength: 10,
      });
    },
  };
  return { storage, requested };
}

describe("GET /api/files/:bucket/*", () => {
  let app: Awaited<ReturnType<typeof buildTestApp>> | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function request(url: string, userId: string | null) {
    const { storage, requested } = fakeStorage();
    app = await buildTestApp({ storage, resolveUserId: () => userId });
    const response = await app.inject({ method: "GET", url });
    return { response, requested };
  }

  it("requires a logged-in user", async () => {
    const { response, requested } = await request(
      `/api/files/item-photos/${OWNER}/photo.jpg`,
      null,
    );

    expect(response.statusCode).toBe(401);
    expect(requested).toEqual([]);
  });

  it("rejects every request while no authentication is wired in", async () => {
    app = await buildTestApp({ storage: fakeStorage().storage });

    const response = await app.inject({
      method: "GET",
      url: `/api/files/item-photos/${OWNER}/photo.jpg`,
    });

    expect(response.statusCode).toBe(401);
  });

  it("streams the owner's file with a private cache header", async () => {
    const { response } = await request(`/api/files/item-photos/${OWNER}/photo.jpg`, OWNER);

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe("jpeg-bytes");
    expect(response.headers["content-type"]).toBe("image/jpeg");
    expect(response.headers["cache-control"]).toBe("private, max-age=300");
    expect(response.headers["content-security-policy"]).toBe("default-src 'none'; sandbox");
  });

  it("answers 404 for another user's file without touching storage", async () => {
    const { response, requested } = await request(
      `/api/files/item-photos/${OWNER}/photo.jpg`,
      OTHER,
    );

    expect(response.statusCode).toBe(404);
    expect(requested).toEqual([]);
  });

  it("answers 404 for a missing file, an unknown bucket and path traversal", async () => {
    for (const url of [
      `/api/files/item-photos/${OWNER}/missing.jpg`,
      `/api/files/other-bucket/${OWNER}/photo.jpg`,
      `/api/files/item-photos/${OWNER}/%2E%2E/${OTHER}/photo.jpg`,
    ]) {
      const { response } = await request(url, OWNER);
      expect(response.statusCode, url).toBe(404);
      await app?.close();
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
