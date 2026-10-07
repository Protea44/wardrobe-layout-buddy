import { redirect } from "@tanstack/react-router";

import { authErrorMessage } from "@/config/auth";
import { authClient } from "@/lib/auth-client";
import { db } from "@/lib/offline/db";
import { isOnline } from "@/lib/offline/online";
import { pendingCount, syncOutbox } from "@/lib/offline/outbox";

// Removes the whole offline copy: items, outfits, cached images and the queue.
export async function clearOfflineData() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()));
  });
}

// The offline copy belongs to one user; another login starts empty.
async function claimOfflineData(userId: string) {
  const owner = await db.meta.get("owner");
  if (owner?.value === userId) return;
  if (owner !== undefined) await clearOfflineData();
  await db.meta.put({ key: "owner", value: userId });
}

// Guard for private pages. Offline, the session cannot be checked; a browser
// that holds a user's offline copy may then show it, every other visitor is
// sent to the login.
export async function requireSession() {
  let result: Awaited<ReturnType<typeof authClient.getSession>> | null = null;
  try {
    result = await authClient.getSession();
  } catch {
    result = null;
  }
  if (result?.data) {
    await claimOfflineData(result.data.user.id);
    return;
  }
  const unreachable = !isOnline() || result === null || (result.error && !result.error.status);
  if (unreachable && (await db.meta.get("owner")) !== undefined) return;
  throw redirect({ to: "/login" });
}

export const UNSYNCED_CHANGES =
  "Einige Offline-Änderungen sind noch nicht synchronisiert. Bitte versuche es gleich noch einmal.";

// Logout: queued changes go out first, since the offline copy, the queue
// and all cached images are deleted afterwards. Returns a German error
// message, or null when the user is signed out.
export async function signOutCompletely(): Promise<string | null> {
  await syncOutbox().catch(() => {});
  if ((await pendingCount()) > 0) return UNSYNCED_CHANGES;
  const result = await authClient.signOut();
  if (result.error) return authErrorMessage(result.error);
  await clearOfflineData();
  return null;
}
