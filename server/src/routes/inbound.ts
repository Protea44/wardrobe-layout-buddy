import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";

import { inboundReceiptSchema, type InboundReceipt } from "@shared/inbound";

import type { AppConfig } from "../config";
import { detectReceiptType } from "../lib/file-type";
import { sendBadRequest, sendUnauthorized } from "../lib/http-errors";
import { newRecordId, storageKey } from "../lib/storage-keys";

export const INBOUND_BODY_LIMIT_BYTES = 15 * 1024 * 1024;
export const INBOUND_SECRET_HEADER = "x-inbound-secret";

// Hashing first gives both sides the same length, so the comparison takes the
// same time however much of the secret matches.
export function secretMatches(expected: string | undefined, received: unknown) {
  if (expected === undefined || typeof received !== "string") return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(expected), digest(received));
}

// The alias of the first recipient at our domain, e.g. from
// "Belege <k7f3m9q2xpab@belege.example.de>". Null if there is none.
export function forwardingAliasFrom(to: string, domain: string) {
  for (const match of to.matchAll(/([^\s<>,;"]+)@([^\s<>,;"]+)/g)) {
    const [, local = "", host = ""] = match;
    if (host.toLowerCase() === domain && /^[a-z0-9]{6,32}$/i.test(local)) {
      return local.toLowerCase();
    }
  }
  return null;
}

type StoredFile = { body: Buffer; contentType: string; filename: string };

// The e-mail itself and every attachment that is a PDF, JPEG or PNG. Other
// attachments (signatures, calendar files, ...) are dropped.
function receiptFiles(mail: InboundReceipt): StoredFile[] {
  const files: StoredFile[] = [];
  if (mail.html !== undefined && mail.html.trim() !== "") {
    files.push({
      body: Buffer.from(mail.html, "utf8"),
      contentType: "text/html; charset=utf-8",
      filename: "email.html",
    });
  }
  for (const attachment of mail.attachments) {
    const body = Buffer.from(attachment.base64, "base64");
    const type = detectReceiptType(body);
    if (type !== null) {
      files.push({ body, contentType: type.contentType, filename: `beleg.${type.extension}` });
    }
  }
  return files;
}

type InboundOptions = {
  config: Pick<
    AppConfig,
    "INBOUND_SECRET" | "INBOUND_RATE_LIMIT_MAX" | "RECEIPT_EMAIL_DOMAIN" | "S3_BUCKET_RECEIPTS"
  >;
};

// Called by the mail provider for every e-mail to a forwarding address. Stores
// the mail and its attachments as PENDING receipts; parsing comes later.
// Neither the mail nor its addresses are ever logged.
export const inboundRoutes: FastifyPluginAsync<InboundOptions> = async (app, { config }) => {
  app.post(
    "/inbound/receipt",
    {
      bodyLimit: INBOUND_BODY_LIMIT_BYTES,
      config: { rateLimit: { max: config.INBOUND_RATE_LIMIT_MAX, timeWindow: "1 minute" } },
      // Runs before the body is read, so unauthenticated callers cannot make
      // the server parse 15 MB.
      onRequest: async (request, reply) => {
        if (!secretMatches(config.INBOUND_SECRET, request.headers[INBOUND_SECRET_HEADER])) {
          return sendUnauthorized(reply);
        }
      },
    },
    async (request, reply) => {
      const mail = inboundReceiptSchema.safeParse(request.body);
      if (!mail.success) return sendBadRequest(reply, "Invalid inbound e-mail");

      // Unknown aliases get the same answer, so aliases cannot be probed.
      const alias = forwardingAliasFrom(mail.data.to, config.RECEIPT_EMAIL_DOMAIN);
      const userId = alias && (await app.repositories.forwardingAliases.findUserId(alias));
      if (!userId) return reply.code(202).send();

      const bucket = config.S3_BUCKET_RECEIPTS;
      const receivedAt = new Date();
      const stored: string[] = [];
      try {
        for (const file of receiptFiles(mail.data)) {
          const id = newRecordId();
          const fileKey = storageKey(userId, id, file.filename);
          stored.push(id);
          await app.storage.putObject(bucket, fileKey, file.body, file.contentType);
          await app.repositories.receipts.create(userId, {
            id,
            fileKey,
            source: "EMAIL",
            parseStatus: "PENDING",
            receivedAt,
          });
        }
      } catch (error) {
        // The provider retries a failed delivery; avoid duplicates from this attempt.
        await Promise.allSettled(
          stored.flatMap((id) => [
            app.storage.deletePrefix(bucket, `${userId}/${id}/`),
            app.repositories.receipts.delete(userId, id),
          ]),
        );
        throw error;
      }
      return reply.code(202).send();
    },
  );
};
