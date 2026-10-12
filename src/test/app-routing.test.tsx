import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("matches every page of the profile area below the /profil layout", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    // "/neu" has to win over an outfit id.
    for (const [path, routeId] of [
      ["/profil/schrank", "/profil/schrank/"],
      ["/profil/schrank/abc", "/profil/schrank/$id"],
      ["/profil/hinzufuegen", "/profil/hinzufuegen"],
      ["/profil/outfits", "/profil/outfits/"],
      ["/profil/outfits/neu", "/profil/outfits/neu"],
      ["/profil/outfits/abc", "/profil/outfits/$id"],
      ["/profil/einstellungen", "/profil/einstellungen"],
    ] as const) {
      const routeIds = router.matchRoutes(path, {}).map((match) => match.routeId);
      expect(routeIds, path).toEqual([rootRouteId, "/profil", routeId]);
    }
  });

  it("matches the add page with the receipt tab", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/profil/hinzufuegen", { tab: "beleg" });

    expect(matches.at(-1)?.routeId).toBe("/profil/hinzufuegen");
  });
});
