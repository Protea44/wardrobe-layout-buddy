import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/")({
  head: () => pageHead("Startseite", "Dein privater digitaler Kleiderschrank und Kaufarchiv: Kleiderschrank Kompakt."),
  component: Index,
});

function Index() {
  return <PlaceholderPage title="Startseite" />;
}
