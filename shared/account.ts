import { z } from "zod";

import { timestampSchema } from "./common";

// The word a user types to confirm the deletion of their account.
export const ACCOUNT_DELETE_CONFIRMATION = "LÖSCHEN";

// Accounts without a password (e.g. Google) must have signed in this recently.
export const FRESH_SIGN_IN_MINUTES = 5;

// GET /api/account
export const accountResponseSchema = z.object({
  name: z.string(),
  email: z.string(),
  createdAt: timestampSchema,
  // False for accounts that only sign in through a provider like Google.
  hasPassword: z.boolean(),
});

// Body of DELETE /api/account. Accounts with a password must send it.
export const accountDeleteSchema = z
  .object({
    confirm: z.literal(ACCOUNT_DELETE_CONFIRMATION),
    password: z.string().min(1).max(256).optional(),
  })
  .strict();

export type AccountResponse = z.infer<typeof accountResponseSchema>;
export type AccountDeleteInput = z.infer<typeof accountDeleteSchema>;
