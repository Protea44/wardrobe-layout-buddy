import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { OutfitEditor } from "@/components/outfits/outfit-editor";
import { pageHead } from "@/config/site";
import { ApiError } from "@/lib/api";
import { loadOutfit } from "@/lib/offline/data";
import { outfitQueryKeys } from "@/lib/outfits-api";
import { requireSession } from "@/lib/offline/session";

export const Route = createFileRoute("/profil_/outfits/$id")({
  // Loads the outfit for the title; the page's query then finds it in the cache.
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData({
        queryKey: outfitQueryKeys.detail(params.id),
        queryFn: () => loadOutfit(params.id),
      })
      .catch(() => null),
  head: ({ loaderData }) =>
    loaderData
      ? pageHead(`Outfit „${loaderData.name}“`, `Das Outfit „${loaderData.name}“ bearbeiten.`)
      : pageHead("Outfit nicht gefunden", "Dieses Outfit gibt es nicht."),
  // Private page; offline it shows the offline copy.
  beforeLoad: requireSession,
  component: OutfitPage,
});

function OutfitPage() {
  const { id } = Route.useParams();
  const outfit = useQuery({ queryKey: outfitQueryKeys.detail(id), queryFn: () => loadOutfit(id) });
  const notFound = outfit.error instanceof ApiError && outfit.error.status === 404;

  return (
    <div className="site-container page-body">
      <Link to="/profil/outfits" className="back-link">
        <ArrowLeft aria-hidden="true" />
        Zurück zu den Outfits
      </Link>
      {outfit.isPending && <p className="receipt-muted">Wird geladen …</p>}
      {outfit.isError && (
        <>
          <h1 className="page-title">{notFound ? "Outfit nicht gefunden" : "Fehler"}</h1>
          <p className="form-error item-detail-error" role="alert">
            {notFound
              ? "Dieses Outfit gibt es nicht."
              : outfit.error instanceof ApiError
                ? outfit.error.message
                : "Das Outfit konnte nicht geladen werden."}
          </p>
        </>
      )}
      {outfit.data && (
        <>
          <h1 className="page-title">Outfit bearbeiten</h1>
          {/* Keyed, so a refetch never resets unsaved changes of another outfit. */}
          <OutfitEditor key={outfit.data.id} outfit={outfit.data} />
        </>
      )}
    </div>
  );
}
