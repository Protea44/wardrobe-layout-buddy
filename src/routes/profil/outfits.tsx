import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/profil/outfits")({
  head: () => pageHead("Outfits", "Deine Outfits bei Kleiderschrank Kompakt."),
  component: OutfitsPage,
});

function OutfitsPage() {
  return <PlaceholderPage title="Outfits" />;
}
