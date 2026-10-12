import type {
  ParseStatus,
  ReceiptCreateInput,
  ReceiptResponse,
  ReceiptSource,
  ReceiptSummary,
  ReceiptUpdateInput,
} from "@shared/receipt";

import type { PrismaClient, Receipt } from "../generated/prisma/client";
import { isRecordKey } from "../lib/storage-keys";
import {
  defined,
  fromDateOnly,
  InvalidStorageKeyError,
  isRecordNotFound,
  toDateOnly,
} from "./errors";

function toResponse(receipt: Receipt): ReceiptResponse {
  return {
    id: receipt.id,
    fileKey: receipt.fileKey,
    source: receipt.source,
    merchant: receipt.merchant,
    purchaseDate: toDateOnly(receipt.purchaseDate),
    receivedAt: receipt.receivedAt.toISOString(),
    parseStatus: receipt.parseStatus,
    createdAt: receipt.createdAt.toISOString(),
  };
}

// The stored file comes first, so the caller picks the id (newRecordId) and
// builds the key from it (storageKey).
type NewReceipt = ReceiptCreateInput & {
  id: string;
  fileKey: string;
  source: ReceiptSource;
  // PENDING by default: waiting for the parser.
  parseStatus?: ParseStatus;
  receivedAt?: Date;
};

// Every function is scoped to userId: other users' receipts do not exist for it.
export function createReceiptRepository(prisma: PrismaClient) {
  return {
    async create(userId: string, input: NewReceipt): Promise<ReceiptResponse> {
      if (!isRecordKey(input.fileKey, userId, input.id)) throw new InvalidStorageKeyError();

      const receipt = await prisma.receipt.create({
        data: {
          id: input.id,
          userId,
          fileKey: input.fileKey,
          source: input.source,
          ...defined({
            merchant: input.merchant,
            purchaseDate: fromDateOnly(input.purchaseDate),
            receivedAt: input.receivedAt,
            parseStatus: input.parseStatus,
          }),
        },
      });
      return toResponse(receipt);
    },

    async get(userId: string, id: string): Promise<ReceiptResponse | null> {
      const receipt = await prisma.receipt.findFirst({ where: { id, userId } });
      return receipt && toResponse(receipt);
    },

    async list(userId: string): Promise<ReceiptResponse[]> {
      const receipts = await prisma.receipt.findMany({
        where: { userId },
        orderBy: [{ receivedAt: "desc" }, { id: "asc" }],
      });
      return receipts.map(toResponse);
    },

    // Like list, with the number of items linked to each receipt.
    async listSummaries(userId: string): Promise<ReceiptSummary[]> {
      const receipts = await prisma.receipt.findMany({
        where: { userId },
        orderBy: [{ receivedAt: "desc" }, { id: "asc" }],
        include: { _count: { select: { items: true } } },
      });
      return receipts.map(({ _count, ...receipt }) => ({
        ...toResponse(receipt),
        itemCount: _count.items,
      }));
    },

    // Null if the receipt does not exist for this user. Details entered by
    // hand mark the receipt as manually maintained.
    async update(
      userId: string,
      id: string,
      input: ReceiptUpdateInput,
    ): Promise<ReceiptResponse | null> {
      try {
        const receipt = await prisma.receipt.update({
          where: { id, userId },
          data: {
            parseStatus: "MANUAL",
            ...defined({
              merchant: input.merchant,
              purchaseDate: fromDateOnly(input.purchaseDate),
            }),
          },
        });
        return toResponse(receipt);
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },

    // False if the receipt does not exist for this user. Items that pointed to
    // it stay and lose the link.
    async delete(userId: string, id: string): Promise<boolean> {
      const { count } = await prisma.receipt.deleteMany({ where: { id, userId } });
      return count > 0;
    },
  };
}

export type ReceiptRepository = ReturnType<typeof createReceiptRepository>;
