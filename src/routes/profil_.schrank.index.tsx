import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

import type { ItemSort } from "@shared/item";

import { Button } from "@/components/ui/button";
import { WardrobeEmpty } from "@/components/wardrobe/wardrobe-empty";
import { WardrobeFilters } from "@/components/wardrobe/wardrobe-filters";
import { WardrobeGrid } from "@/components/wardrobe/wardrobe-grid";
import { WardrobeToolbar } from "@/components/wardrobe/wardrobe-toolbar";
import { pageHead } from "@/config/site";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { fetchItemFacets, fetchItems, itemQueryKeys } from "@/lib/items-api";
import {
  activeFilters,
  parseWardrobeSearch,
  withoutAllFilters,
  type WardrobeSearch,
} from "@/lib/wardrobe-search";

export const Route = createFileRoute("/profil_/schrank/")({
  validateSearch: parseWardrobeSearch,
  head: () => pageHead("Mein Schrank", "Alle Teile in deinem privaten Kleiderschrank."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
  component: WardrobePage,
});

function WardrobePage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const list = useInfiniteQuery({
    queryKey: itemQueryKeys.list(search),
    queryFn: ({ pageParam }) => fetchItems(search, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    // Keeps the grid in place while a new filter loads.
    placeholderData: keepPreviousData,
  });
  const facets = useQuery({ queryKey: itemQueryKeys.facets, queryFn: fetchItemFacets });

  // Filters and sort add a history entry, so "back" undoes them. Typing does not.
  const update = useCallback(
    (next: WardrobeSearch, replace = false) => void navigate({ search: next, replace }),
    [navigate],
  );
  const changeQuery = useCallback(
    (q: string) => {
      const next = { ...search };
      if (q === "") delete next.q;
      else next.q = q;
      update(next, true);
    },
    [search, update],
  );
  const changeSort = (sort: ItemSort) => {
    const next = { ...search };
    if (sort === "newest") delete next.sort;
    else next.sort = sort;
    update(next);
  };

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const total = list.data?.pages[0]?.total ?? null;
  const filtered = activeFilters(search).length > 0 || search.q !== undefined;
  const emptyWardrobe = total === 0 && !filtered;

  return (
    <div className="site-container page-body wardrobe-page">
      <h1 className="page-title">Mein Schrank</h1>

      {list.isError && (
        <p className="form-error wardrobe-message" role="alert">
          {list.error instanceof ApiError
            ? list.error.message
            : "Dein Schrank konnte nicht geladen werden."}
        </p>
      )}
      {list.isPending && (
        <p className="receipt-muted wardrobe-message">Dein Schrank wird geladen …</p>
      )}

      {emptyWardrobe && <WardrobeEmpty />}

      {total !== null && !emptyWardrobe && (
        <>
          <WardrobeToolbar
            query={search.q ?? ""}
            sort={search.sort ?? "newest"}
            total={total}
            onQueryChange={changeQuery}
            onSortChange={changeSort}
          />
          <WardrobeFilters search={search} facets={facets.data} onChange={update} />
          {total === 0 ? (
            <div className="wardrobe-empty">
              <p className="wardrobe-empty-title">Keine Teile gefunden.</p>
              <Button
                type="button"
                variant="outline"
                className="h-12 px-6 text-base"
                onClick={() => update(withoutAllFilters(search))}
              >
                Alle zurücksetzen
              </Button>
            </div>
          ) : (
            <WardrobeGrid
              items={items}
              search={search}
              hasMore={hasNextPage}
              loadingMore={isFetchingNextPage}
              onLoadMore={loadMore}
            />
          )}
        </>
      )}
    </div>
  );
}
