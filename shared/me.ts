import { z } from "zod";

import { idSchema } from "./common";

// The logged-in user's own profile, from GET /api/me.
export const meResponseSchema = z.object({
  id: idSchema,
  email: z.string().email(),
  displayName: z.string(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;
