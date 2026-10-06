import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/agb")({
  head: () => pageHead("AGB", "Die Seite für die Allgemeinen Geschäftsbedingungen von Kleiderschrank Kompakt."),
  component: TermsPage,
});

function TermsPage() { return <PlaceholderPage title="AGB" />; }