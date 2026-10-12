import { ZipArchive } from "archiver";
import { getCookies } from "better-auth/cookies";
import type { FastifyPluginAsync, FastifyReply } from "fastify";
import type { Readable } from "node:stream";

import { accountDeleteSchema, FRESH_SIGN_IN_MINUTES, type AccountResponse } from "@shared/account";

import type { AppConfig } from "../config";
import { exportFilename, itemsCsv, keyFilename } from "../lib/export";
import { sendBadRequest, sendError, sendNotFound, sendUnauthorized } from "../lib/http-errors";
import { toFetchHeaders } from "../plugins/auth";

type AccountOptions = {
  config: Pick<
    AppConfig,
    "S3_BUCKET_ITEM_PHOTOS" | "S3_BUCKET_RECEIPTS" | "AUTH_RATE_LIMIT_MAX" | "EXPORT_RATE_LIMIT_MAX"
  >;
};

// Adds one entry and waits until the archive has written it, so only one
// storage stream is open at a time.
function appendAndWait(archive: ZipArchive, source: Readable | string, name: string) {
  return new Promise<void>((resolve, reject) => {
    const onEntry = (entry: { name: string }) => {
      if (entry.name !== name) return;
      archive.off("entry", onEntry);
      archive.off("error", onError);
      resolve();
    };
    const onError = (error: Error) => {
      archive.off("entry", onEntry);
      reject(error);
    };
    archive.on("entry", onEntry);
    archive.once("error", onError);
    archive.append(source, { name });
  });
}

export const accountRoutes: FastifyPluginAsync<AccountOptions> = async (app, { config }) => {
  // Sets every Better Auth cookie to expire, so the browser forgets the session.
  function clearAuthCookies(reply: FastifyReply) {
    const cookies = Object.values(getCookies(app.auth.options)).map(({ name, attributes }) =>
      [
        `${name}=`,
        `Path=${attributes.path}`,
        "Max-Age=0",
        "HttpOnly",
        `SameSite=${attributes.sameSite}`,
        ...(attributes.secure ? ["Secure"] : []),
        ...(attributes.domain ? [`Domain=${attributes.domain}`] : []),
      ].join("; "),
    );
    reply.header("set-cookie", cookies);
  }

  app.get("/account", async (request, reply) => {
    if (request.userId === null) return sendUnauthorized(reply);
    const profile: AccountResponse | null = await app.repositories.account.profile(request.userId);
    return profile ?? sendNotFound(reply);
  });

  // A ZIP with daten.json, kleidung.csv, fotos/ and belege/, built while it is
  // sent. Neither file names nor contents are logged.
  app.get(
    "/account/export",
    { config: { rateLimit: { max: config.EXPORT_RATE_LIMIT_MAX, timeWindow: "1 hour" } } },
    async (request, reply) => {
      if (request.userId === null) return sendUnauthorized(reply);
      const userId = request.userId;

      const profile = await app.repositories.account.profile(userId);
      if (profile === null) return sendNotFound(reply);
      const [items, receipts, outfits] = await Promise.all([
        app.repositories.items.list(userId),
        app.repositories.receipts.list(userId),
        app.repositories.outfits.list(userId),
      ]);

      const archive = new ZipArchive({ zlib: { level: 6 } });
      const log = request.log;

      async function fill() {
        const data = {
          exportedAt: new Date().toISOString(),
          profile: { name: profile?.name, email: profile?.email, createdAt: profile?.createdAt },
          items,
          receipts,
          outfits,
        };
        await appendAndWait(archive, JSON.stringify(data, null, 2), "daten.json");
        await appendAndWait(archive, itemsCsv(items), "kleidung.csv");

        for (const item of items) {
          if (item.photoKey === null) continue;
          const photo = await app.storage.getObjectStream(
            config.S3_BUCKET_ITEM_PHOTOS,
            item.photoKey,
          );
          if (photo === null) continue;
          const extension = keyFilename(item.photoKey).split(".").pop() ?? "webp";
          await appendAndWait(archive, photo.stream, `fotos/${item.id}.${extension}`);
        }
        for (const receipt of receipts) {
          const file = await app.storage.getObjectStream(
            config.S3_BUCKET_RECEIPTS,
            receipt.fileKey,
          );
          if (file === null) continue;
          await appendAndWait(
            archive,
            file.stream,
            `belege/${receipt.id}-${keyFilename(receipt.fileKey)}`,
          );
        }
        await archive.finalize();
      }

      void fill().catch(() => {
        log.error("Building the data export failed");
        archive.abort();
        archive.destroy(new Error("Export aborted"));
      });

      return reply
        .header("Content-Disposition", `attachment; filename="${exportFilename()}"`)
        .header("Cache-Control", "no-store")
        .type("application/zip")
        .send(archive);
    },
  );

  // Deletes every file and row of the user and ends the session. Needs the
  // confirmation word and a fresh proof of identity: the password, or for
  // accounts without one a sign-in within the last few minutes.
  app.delete(
    "/account",
    { config: { rateLimit: { max: config.AUTH_RATE_LIMIT_MAX, timeWindow: "1 minute" } } },
    async (request, reply) => {
      if (request.userId === null) return sendUnauthorized(reply);
      const userId = request.userId;
      const input = accountDeleteSchema.safeParse(request.body);
      if (!input.success) return sendBadRequest(reply, "Confirmation missing");

      const profile = await app.repositories.account.profile(userId);
      if (profile === null) return sendNotFound(reply);
      const headers = toFetchHeaders(request);

      if (profile.hasPassword) {
        if (input.data.password === undefined) {
          return sendError(reply, 403, "Forbidden", "Password required");
        }
        try {
          await app.auth.api.verifyPassword({ body: { password: input.data.password }, headers });
        } catch {
          return sendError(reply, 403, "Forbidden", "Wrong password");
        }
      } else {
        const session = await app.auth.api.getSession({ headers });
        const signedInAt = session?.session.createdAt.getTime() ?? 0;
        if (Date.now() - signedInAt > FRESH_SIGN_IN_MINUTES * 60 * 1000) {
          return sendError(reply, 403, "Forbidden", "Fresh sign-in required");
        }
      }

      // Files first: if this fails, the account still exists and can try again.
      await app.storage.deletePrefix(config.S3_BUCKET_ITEM_PHOTOS, `${userId}/`);
      await app.storage.deletePrefix(config.S3_BUCKET_RECEIPTS, `${userId}/`);
      await app.repositories.account.deleteEverything(userId);

      clearAuthCookies(reply);
      return reply.code(204).send();
    },
  );
};
