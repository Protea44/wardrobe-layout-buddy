import { PassThrough } from "node:stream";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  buildTestApp,
  createTwoUsers,
  resetDatabase,
  type TestApp,
  type TestUser,
} from "../test/build-test-app";
import { createMemoryStorage } from "../test/memory-storage";
import { fakePdf } from "../test/multipart";
import { forwardingAliasFrom, secretMatches } from "./inbound";

const SECRET = "inbound-test-secret-with-at-least-32-chars";
const DOMAIN = "belege.example.test";

describe("POST /api/inbound/receipt", () => {
  let app: TestApp;
  let memory: ReturnType<typeof createMemoryStorage>;
  let a: TestUser;
  let b: TestUser;
  let alias: string;
  let logs = "";

  beforeAll(async () => {
    memory = createMemoryStorage();
    const logStream = new PassThrough();
    logStream.on("data", (chunk: Buffer) => (logs += chunk.toString()));
    app = await buildTestApp({
      storage: memory.storage,
      logStream,
      config: {
        INBOUND_SECRET: SECRET,
        RECEIPT_EMAIL_DOMAIN: DOMAIN,
        INBOUND_RATE_LIMIT_MAX: 1000,
        LOG_LEVEL: "info",
      },
    });
  });
  beforeEach(async () => {
    memory.objects.clear();
    logs = "";
    await resetDatabase(app);
    ({ a, b } = await createTwoUsers(app));
    alias = (await app.repositories.forwardingAliases.getOrCreate(a.userId)) ?? "";
  });
  afterAll(() => app.close());

  function mail(overrides: Record<string, unknown> = {}) {
    return {
      to: `Belege <${alias}@${DOMAIN}>`,
      from: "Shop <bestellung@shop.example>",
      subject: "Deine Bestellung QXKK31415",
      html: "<p>Vielen Dank für deine Bestellung, Erika Mustermann!</p>",
      attachments: [
        {
          filename: "rechnung.pdf",
          contentType: "application/pdf",
          base64: Buffer.from(fakePdf()).toString("base64"),
        },
        {
          filename: "logo.gif",
          contentType: "image/gif",
          base64: Buffer.from("GIF89a").toString("base64"),
        },
      ],
      ...overrides,
    };
  }

  function post(payload: unknown, secret: string | undefined = SECRET) {
    return app.inject({
      method: "POST",
      url: "/api/inbound/receipt",
      headers: secret === undefined ? {} : { "x-inbound-secret": secret },
      payload: payload as Record<string, unknown>,
    });
  }

  it("refuses requests without the right secret", async () => {
    expect((await post(mail(), undefined)).statusCode).toBe(401);
    expect((await post(mail(), "wrong")).statusCode).toBe(401);
    expect((await post(mail(), `${SECRET}x`)).statusCode).toBe(401);
    expect(memory.objects.size).toBe(0);
  });

  it("stores the e-mail and the PDF attachment as PENDING receipts of the alias owner", async () => {
    const response = await post(mail());

    expect(response.statusCode).toBe(202);
    const receipts = await app.repositories.receipts.list(a.userId);
    expect(receipts).toHaveLength(2);
    for (const receipt of receipts) {
      expect(receipt).toMatchObject({ source: "EMAIL", parseStatus: "PENDING" });
      expect(receipt.fileKey.startsWith(`${a.userId}/${receipt.id}/`)).toBe(true);
    }
    const types = receipts.map(
      (receipt) => memory.objects.get(`receipts/${receipt.fileKey}`)?.contentType,
    );
    expect(types.sort()).toEqual(["application/pdf", "text/html; charset=utf-8"]);
    expect(await app.repositories.receipts.list(b.userId)).toEqual([]);
    // No item is created yet.
    expect(await app.repositories.items.list(a.userId)).toEqual([]);
  });

  it("answers 202 for unknown aliases and foreign domains without storing anything", async () => {
    for (const to of [
      `unknownalias99@${DOMAIN}`,
      `${alias}@other.example`,
      "not an address",
      `${alias.slice(0, 5)}@${DOMAIN}`,
    ]) {
      const response = await post(mail({ to }));
      expect(response.statusCode, to).toBe(202);
    }
    expect(memory.objects.size).toBe(0);
  });

  it("finds the alias among several recipients and ignores its case", async () => {
    const response = await post(
      mail({ to: `someone@else.example, ${alias.toUpperCase()}@${DOMAIN.toUpperCase()}` }),
    );

    expect(response.statusCode).toBe(202);
    expect(await app.repositories.receipts.list(a.userId)).toHaveLength(2);
  });

  it("refuses an invalid body once the secret is right", async () => {
    expect((await post({ to: "x" })).statusCode).toBe(400);
    expect(
      (
        await post(
          mail({ attachments: [{ filename: "a", contentType: "a", base64: "not*base64" }] }),
        )
      ).statusCode,
    ).toBe(400);
  });

  it("refuses bodies above 15 MB", async () => {
    const huge = "a".repeat(15 * 1024 * 1024);
    const response = await post(mail({ html: huge }));

    expect(response.statusCode).toBe(413);
    expect(memory.objects.size).toBe(0);
  });

  it("never logs the e-mail, its addresses or the secret", async () => {
    await post(mail());

    for (const secretText of ["Erika", "bestellung@shop.example", alias, SECRET, "QXKK31415"]) {
      expect(logs).not.toContain(secretText);
    }
  });
});

describe("secretMatches", () => {
  it("needs a configured secret and an exact match", () => {
    expect(secretMatches(SECRET, SECRET)).toBe(true);
    expect(secretMatches(SECRET, SECRET.slice(1))).toBe(false);
    expect(secretMatches(SECRET, undefined)).toBe(false);
    expect(secretMatches(SECRET, [SECRET])).toBe(false);
    expect(secretMatches(undefined, "")).toBe(false);
  });
});

describe("forwardingAliasFrom", () => {
  it("returns the lower-case alias of the first address at the domain", () => {
    expect(forwardingAliasFrom("k7f3m9q2xpab@belege.de", "belege.de")).toBe("k7f3m9q2xpab");
    expect(forwardingAliasFrom('"Belege" <K7F3M9Q2XPAB@Belege.de>', "belege.de")).toBe(
      "k7f3m9q2xpab",
    );
    expect(forwardingAliasFrom("a@x.de; k7f3m9q2xpab@belege.de", "belege.de")).toBe("k7f3m9q2xpab");
  });

  it("returns null without a valid alias at the domain", () => {
    expect(forwardingAliasFrom("k7f3m9q2xpab@evil.de", "belege.de")).toBeNull();
    expect(forwardingAliasFrom("a.b+c@belege.de", "belege.de")).toBeNull();
    expect(forwardingAliasFrom("", "belege.de")).toBeNull();
  });
});
