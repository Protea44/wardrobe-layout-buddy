import { outfitResponseSchema, type OutfitSaveInput } from "@shared/outfit";

import { api } from "@/lib/api";

export const outfitQueryKeys = {
  all: ["outfits"] as const,
  detail: (id: string) => ["outfits", "detail", id] as const,
};

export function fetchOutfits() {
  return api("/outfits", { schema: outfitResponseSchema.array() });
}

export function fetchOutfit(id: string) {
  return api(`/outfits/${encodeURIComponent(id)}`, { schema: outfitResponseSchema });
}

// Creates the outfit (under the client's id, so a retry cannot duplicate it),
// or replaces it entirely when an id is given.
export function saveOutfit(id: string | null, input: OutfitSaveInput, clientId?: string) {
  return id === null
    ? api("/outfits", {
        method: "POST",
        body: { ...input, ...(clientId !== undefined && { id: clientId }) },
        schema: outfitResponseSchema,
      })
    : api(`/outfits/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: input,
        schema: outfitResponseSchema,
      });
}

export async function deleteOutfit(id: string) {
  await api(`/outfits/${encodeURIComponent(id)}`, { method: "DELETE" });
}
