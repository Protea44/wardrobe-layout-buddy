import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/profil/schrank")({
  head: () => pageHead("Mein Schrank", "Dein privater Kleiderschrank bei Kleiderschrank Kompakt."),
  component: WardrobePage,
});

function WardrobePage() {
  return <PlaceholderPage title="Mein Schrank" />;
}
