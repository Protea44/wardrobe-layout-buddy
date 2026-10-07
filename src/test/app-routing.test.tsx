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

  it("matches the add page instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/profil/hinzufuegen", { tab: "beleg" });

    expect(matches.at(-1)?.routeId).toBe("/profil_/hinzufuegen");
  });

  it("matches the wardrobe and an item page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    expect(router.matchRoutes("/profil/schrank", {}).at(-1)?.routeId).toBe("/profil_/schrank/");
    expect(router.matchRoutes("/profil/schrank/abc", {}).at(-1)?.routeId).toBe(
      "/profil_/schrank/$id",
    );
  });
});
