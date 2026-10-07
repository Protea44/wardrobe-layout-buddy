import type { PrismaClient } from "../generated/prisma/client";

// The account itself. Scoped to userId like every repository.
export function createAccountRepository(prisma: PrismaClient) {
  return {
    async profile(userId: string) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, createdAt: true },
      });
      if (!user) return null;
      const password = await prisma.account.count({
        where: { userId, providerId: "credential", password: { not: null } },
      });
      return {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
        hasPassword: password > 0,
      };
    },

    // Every row that belongs to the user, in one transaction, the user last.
    // Files are not touched here.
    async deleteEverything(userId: string): Promise<void> {
      await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
        if (!user) return;
        await tx.outfitItem.deleteMany({ where: { outfit: { userId } } });
        await tx.outfit.deleteMany({ where: { userId } });
        await tx.item.deleteMany({ where: { userId } });
        await tx.receipt.deleteMany({ where: { userId } });
        await tx.session.deleteMany({ where: { userId } });
        await tx.account.deleteMany({ where: { userId } });
        // Open password reset or verification tokens.
        await tx.verification.deleteMany({
          where: { OR: [{ value: userId }, { identifier: user.email }] },
        });
        await tx.user.delete({ where: { id: userId } });
      });
    },
  };
}

export type AccountRepository = ReturnType<typeof createAccountRepository>;
