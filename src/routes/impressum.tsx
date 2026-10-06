import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/impressum")({
  head: () => pageHead("Impressum", "Die Seite für Anbieterangaben und rechtliche Informationen zu Kleiderschrank Kompakt."),
  component: ImprintPage,
});

function ImprintPage() { return <PlaceholderPage title="Impressum" />; }