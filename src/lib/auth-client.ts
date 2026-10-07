import { createAuthClient } from "better-auth/react";

// Talks to /api/auth on the page's own origin; the session lives in an HttpOnly cookie.
export const authClient = createAuthClient();

export type SessionUser = typeof authClient.$Infer.Session.user;
