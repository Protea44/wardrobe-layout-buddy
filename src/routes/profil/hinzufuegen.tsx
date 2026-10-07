import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/profil/hinzufuegen")({
  head: () =>
    pageHead(
      "Teil hinzufügen",
      "Füge deinem Schrank bei Kleiderschrank Kompakt ein neues Teil hinzu.",
    ),
  component: AddItemPage,
});

function AddItemPage() {
  return <PlaceholderPage title="Teil hinzufügen" />;
}
