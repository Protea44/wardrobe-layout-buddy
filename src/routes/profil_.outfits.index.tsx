import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { OutfitPreview } from "@/components/outfits/outfit-preview";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/config/site";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { fetchOutfits, outfitQueryKeys } from "@/lib/outfits-api";

export const Route = createFileRoute("/profil_/outfits/")({
  head: () => pageHead("Meine Outfits", "Deine gespeicherten Outfits aus deinem Kleiderschrank."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
  component: OutfitsPage,
});

function NewOutfitButton() {
  return (
    <Button asChild className="h-12 px-6 text-base">
      <Link to="/profil/outfits/neu">
        <Plus aria-hidden="true" />
        Neues Outfit
      </Link>
    </Button>
  );
}

function OutfitsPage() {
  const outfits = useQuery({ queryKey: outfitQueryKeys.all, queryFn: fetchOutfits });

  return (
    <div className="site-container page-body wardrobe-page">
      <div className="outfits-head">
        <h1 className="page-title">Meine Outfits</h1>
        {outfits.data !== undefined && outfits.data.length > 0 && <NewOutfitButton />}
      </div>

      {outfits.isPending && <p className="receipt-muted">Deine Outfits werden geladen …</p>}
      {outfits.isError && (
        <p className="form-error" role="alert">
          {outfits.error instanceof ApiError
            ? outfits.error.message
            : "Deine Outfits konnten nicht geladen werden."}
        </p>
      )}

      {outfits.data?.length === 0 && (
        <div className="wardrobe-empty">
          <p className="wardrobe-empty-title">Du hast noch keine Outfits.</p>
          <p className="receipt-section-text outfits-empty-text">
            Stell aus den Teilen in deinem Schrank Kombinationen zusammen: Teile auswählen, auf der
            Fläche anordnen und unter einem Namen speichern – zum Beispiel für das Büro oder eine
            Hochzeit.
          </p>
          <NewOutfitButton />
        </div>
      )}

      {outfits.data !== undefined && outfits.data.length > 0 && (
        <ul className="outfits-grid">
          {outfits.data.map((outfit) => (
            <li key={outfit.id}>
              <Link to="/profil/outfits/$id" params={{ id: outfit.id }} className="outfit-card">
                <OutfitPreview outfit={outfit} />
                <span className="outfit-card-text">
                  <span className="item-card-name">{outfit.name}</span>
                  {outfit.occasion !== null && (
                    <span className="receipt-muted">{outfit.occasion}</span>
                  )}
                  <span className="receipt-muted">
                    {outfit.items.length === 1 ? "1 Teil" : `${outfit.items.length} Teile`}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
