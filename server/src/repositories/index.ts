import type { PrismaClient } from "../generated/prisma/client";
import { createItemRepository } from "./items";
import { createOutfitRepository } from "./outfits";
import { createReceiptRepository } from "./receipts";
import { createUserRepository } from "./users";

// The only place routes get data from: every function takes the user id first
// and never returns or changes another user's records.
export function createRepositories(prisma: PrismaClient) {
  return {
    items: createItemRepository(prisma),
    receipts: createReceiptRepository(prisma),
    outfits: createOutfitRepository(prisma),
    users: createUserRepository(prisma),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
