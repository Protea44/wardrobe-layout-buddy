import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/datenschutz")({
  head: () => pageHead("Datenschutz", "Die Seite für Informationen zum Schutz deiner personenbezogenen Daten bei Kleiderschrank Kompakt."),
  component: PrivacyPage,
});

function PrivacyPage() { return <PlaceholderPage title="Datenschutz" />; }