import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";

import { buildApp } from "../app";
import { loadConfig } from "../config";
import { loggablePath } from "./logger";
import { createStorage } from "./storage";

describe("request logging", () => {
  it("never writes bodies, cookies, authorization headers or query strings", async () => {
    let output = "";
    const logStream = new Writable({
      write(chunk: Buffer, _encoding, done) {
        output += chunk.toString();
        done();
      },
    });
    const config = { ...loadConfig(), LOG_LEVEL: "trace" as const };
    const app = await buildApp({ config, storage: createStorage(config), logStream });

    await app.inject({
      method: "POST",
      url: "/api/health?token=query-secret",
      headers: { cookie: "session=cookie-secret", authorization: "Bearer header-secret" },
      payload: { password: "body-secret" },
    });
    await app.close();

    expect(output).toContain("/api/health");
    expect(output).not.toMatch(/query-secret|cookie-secret|header-secret|body-secret/);
  });
});

describe("loggablePath", () => {
  it("drops the query string and masks ids", () => {
    expect(
      loggablePath(
        "/api/files/item-photos/1glcROtVwBZxJhgnkfR0HBMpFZ2pQ0cZ/e67a6893-0d5e-40d3-b7c7-1c76c11ef0fa/photo.webp?x=1",
      ),
    ).toBe("/api/files/item-photos/:id/:id/photo.webp");
    expect(loggablePath("/api/outfits/4cb6c98f-c0ab-4a04-af48-a934787814be")).toBe(
      "/api/outfits/:id",
    );
    expect(loggablePath("/api/receipts/forwarding-alias")).toBe("/api/receipts/forwarding-alias");
    expect(loggablePath("/profil/schrank?q=hemd")).toBe("/profil/schrank");
  });
});
