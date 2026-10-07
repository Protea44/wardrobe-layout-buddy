import type { MeResponse } from "@shared/me";

import type { PrismaClient } from "../generated/prisma/client";

export function createUserRepository(prisma: PrismaClient) {
  return {
    // The user's own profile; null if the account no longer exists.
    async getProfile(userId: string): Promise<MeResponse | null> {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });
      // The name given at sign-up is what the app shows as display name.
      return user && { id: user.id, email: user.email, displayName: user.name };
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
