import { randomInt } from "node:crypto";

import type { PrismaClient } from "../generated/prisma/client";
import { isUniqueViolation } from "./errors";

const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const ALIAS_LENGTH = 12;

// About 60 bits of randomness: aliases cannot be guessed.
function randomAlias() {
  return Array.from({ length: ALIAS_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

// The local part of a user's receipt forwarding address.
export function createForwardingAliasRepository(prisma: PrismaClient) {
  return {
    // Creates the alias on first use. Null if the user does not exist.
    async getOrCreate(userId: string): Promise<string | null> {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { forwardingAlias: true },
        });
        if (!user) return null;
        if (user.forwardingAlias !== null) return user.forwardingAlias;

        try {
          // Only sets it if no parallel request did so in the meantime.
          await prisma.user.updateMany({
            where: { id: userId, forwardingAlias: null },
            data: { forwardingAlias: randomAlias() },
          });
        } catch (error) {
          // Another user already has this alias: try a new one.
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new Error("Could not create a forwarding alias");
    },

    // Only for inbound e-mail, which arrives without a session.
    async findUserId(alias: string): Promise<string | null> {
      const user = await prisma.user.findUnique({
        where: { forwardingAlias: alias },
        select: { id: true },
      });
      return user?.id ?? null;
    },
  };
}

export type ForwardingAliasRepository = ReturnType<typeof createForwardingAliasRepository>;
