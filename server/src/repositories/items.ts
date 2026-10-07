import type { ItemCreateInput, ItemResponse, ItemUpdateInput, LifecycleStatus } from "@shared/item";

import type { Item, PrismaClient } from "../generated/prisma/client";
import { isRecordKey } from "../lib/storage-keys";
import {
  defined,
  fromDateOnly,
  InvalidStorageKeyError,
  isRecordNotFound,
  RelatedRecordNotFoundError,
  toDateOnly,
} from "./errors";

function toResponse(item: Item): ItemResponse {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    color: item.color,
    brand: item.brand,
    size: item.size,
    price: item.price === null ? null : item.price.toFixed(2),
    currency: item.currency,
    purchaseDate: toDateOnly(item.purchaseDate),
    material: item.material,
    retailer: item.retailer,
    productUrl: item.productUrl,
    seasons: item.seasons,
    notes: item.notes,
    photoKey: item.photoKey,
    thumbnailKey: item.thumbnailKey,
    receiptId: item.receiptId,
    visibility: item.visibility,
    isForSale: item.isForSale,
    isTradeable: item.isTradeable,
    isLinkable: item.isLinkable,
    lifecycleStatus: item.lifecycleStatus,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

type ItemFilter = {
  category?: string;
  brand?: string;
  lifecycleStatus?: LifecycleStatus;
};

type ItemPhoto = {
  photoKey: string | null;
  thumbnailKey: string | null;
};

// Every function is scoped to userId: other users' items do not exist for it,
// whatever their visibility says.
export function createItemRepository(prisma: PrismaClient) {
  // An item may only point to a receipt of the same user.
  async function assertOwnReceipt(userId: string, receiptId: string | null | undefined) {
    if (receiptId === undefined || receiptId === null) return;
    const receipt = await prisma.receipt.findFirst({
      where: { id: receiptId, userId },
      select: { id: true },
    });
    if (!receipt) throw new RelatedRecordNotFoundError("Receipt");
  }

  function columns(input: ItemCreateInput | ItemUpdateInput) {
    return defined({
      name: input.name,
      category: input.category,
      color: input.color,
      brand: input.brand,
      size: input.size,
      price: input.price,
      currency: input.currency,
      purchaseDate: fromDateOnly(input.purchaseDate),
      material: input.material,
      retailer: input.retailer,
      productUrl: input.productUrl,
      seasons: input.seasons,
      notes: input.notes,
      receiptId: input.receiptId,
    });
  }

  return {
    // Pass an id (newRecordId) when the photo is stored before the row exists.
    async create(userId: string, input: ItemCreateInput, id?: string): Promise<ItemResponse> {
      await assertOwnReceipt(userId, input.receiptId);

      const item = await prisma.item.create({
        data: {
          ...columns(input),
          name: input.name,
          category: input.category,
          userId,
          ...(id !== undefined && { id }),
        },
      });
      return toResponse(item);
    },

    async get(userId: string, id: string): Promise<ItemResponse | null> {
      const item = await prisma.item.findFirst({ where: { id, userId } });
      return item && toResponse(item);
    },

    async list(userId: string, filter: ItemFilter = {}): Promise<ItemResponse[]> {
      const items = await prisma.item.findMany({
        where: { ...defined(filter), userId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      });
      return items.map(toResponse);
    },

    // Null if the item does not exist for this user.
    async update(userId: string, id: string, input: ItemUpdateInput): Promise<ItemResponse | null> {
      await assertOwnReceipt(userId, input.receiptId);

      try {
        const item = await prisma.item.update({
          where: { id, userId },
          data: { ...columns(input), ...defined({ lifecycleStatus: input.lifecycleStatus }) },
        });
        return toResponse(item);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },

    // Called after an upload or a photo removal. Null if the item does not
    // exist for this user.
    async setPhoto(userId: string, id: string, photo: ItemPhoto): Promise<ItemResponse | null> {
      for (const key of [photo.photoKey, photo.thumbnailKey]) {
        if (key !== null && !isRecordKey(key, userId, id)) throw new InvalidStorageKeyError();
      }

      try {
        const item = await prisma.item.update({ where: { id, userId }, data: photo });
        return toResponse(item);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },

    // False if the item does not exist for this user. The item also leaves
    // every outfit it was part of.
    async delete(userId: string, id: string): Promise<boolean> {
      const { count } = await prisma.item.deleteMany({ where: { id, userId } });
      return count > 0;
    },
  };
}

export type ItemRepository = ReturnType<typeof createItemRepository>;
