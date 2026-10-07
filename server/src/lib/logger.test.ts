import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";

import { buildApp } from "../app";
import { loadConfig } from "../config";
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
