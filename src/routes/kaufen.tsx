import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/kaufen")({
  head: () => pageHead("Kleidung kaufen", "Deine Seite für Kleidung und neue Käufe bei Kleiderschrank Kompakt."),
  component: BuyingPage,
});

function BuyingPage() { return <PlaceholderPage title="Kleidung kaufen" />; }