import type {
  OutfitCreateInput,
  OutfitItemInput,
  OutfitResponse,
  OutfitUpdateInput,
} from "@shared/outfit";

import type { Outfit, OutfitItem, Prisma, PrismaClient } from "../generated/prisma/client";
import { defined, isRecordNotFound, RelatedRecordNotFoundError } from "./errors";

const withItems = {
  items: { orderBy: [{ zIndex: "asc" }, { itemId: "asc" }] },
} satisfies Prisma.OutfitInclude;

function toResponse(outfit: Outfit & { items: OutfitItem[] }): OutfitResponse {
  return {
    id: outfit.id,
    name: outfit.name,
    occasion: outfit.occasion,
    items: outfit.items.map(({ itemId, x, y, scale, zIndex }) => ({ itemId, x, y, scale, zIndex })),
    createdAt: outfit.createdAt.toISOString(),
    updatedAt: outfit.updatedAt.toISOString(),
  };
}

// Every function is scoped to userId: other users' outfits do not exist for it.
export function createOutfitRepository(prisma: PrismaClient) {
  return {
    async create(userId: string, input: OutfitCreateInput): Promise<OutfitResponse> {
      const outfit = await prisma.outfit.create({
        data: { name: input.name, userId, ...defined({ occasion: input.occasion }) },
        include: withItems,
      });
      return toResponse(outfit);
    },

    async get(userId: string, id: string): Promise<OutfitResponse | null> {
      const outfit = await prisma.outfit.findFirst({ where: { id, userId }, include: withItems });
      return outfit && toResponse(outfit);
    },

    async list(userId: string): Promise<OutfitResponse[]> {
      const outfits = await prisma.outfit.findMany({
        where: { userId },
        include: withItems,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      });
      return outfits.map(toResponse);
    },

    // Null if the outfit does not exist for this user.
    async update(
      userId: string,
      id: string,
      input: OutfitUpdateInput,
    ): Promise<OutfitResponse | null> {
      try {
        const outfit = await prisma.outfit.update({
          where: { id, userId },
          data: defined({ name: input.name, occasion: input.occasion }),
          include: withItems,
        });
        return toResponse(outfit);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },

    // False if the outfit does not exist for this user.
    async delete(userId: string, id: string): Promise<boolean> {
      const { count } = await prisma.outfit.deleteMany({ where: { id, userId } });
      return count > 0;
    },

    // Places an item on the outfit, or moves it if it is already there. Null if
    // the outfit does not exist for this user; the item must be theirs as well.
    async setItem(
      userId: string,
      outfitId: string,
      placement: OutfitItemInput,
    ): Promise<OutfitResponse | null> {
      const { itemId, ...position } = placement;

      return prisma.$transaction(async (tx) => {
        const outfit = await tx.outfit.findFirst({
          where: { id: outfitId, userId },
          select: { id: true },
        });
        if (!outfit) return null;

        const item = await tx.item.findFirst({
          where: { id: itemId, userId },
          select: { id: true },
        });
        if (!item) throw new RelatedRecordNotFoundError("Item");

        await tx.outfitItem.upsert({
          where: { outfitId_itemId: { outfitId, itemId } },
          create: { outfitId, itemId, ...position },
          update: position,
        });
        const updated = await tx.outfit.update({
          where: { id: outfitId },
          // Touches updatedAt: the outfit changed even though its own columns did not.
          data: { updatedAt: new Date() },
          include: withItems,
        });
        return toResponse(updated);
      });
    },

    // False if the outfit does not exist for this user or the item is not on it.
    async removeItem(userId: string, outfitId: string, itemId: string): Promise<boolean> {
      const { count } = await prisma.outfitItem.deleteMany({
        where: { outfitId, itemId, outfit: { userId } },
      });
      return count > 0;
    },
  };
}

export type OutfitRepository = ReturnType<typeof createOutfitRepository>;
