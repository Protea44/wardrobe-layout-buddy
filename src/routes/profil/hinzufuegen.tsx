import { createFileRoute } from "@tanstack/react-router";

import { ItemForm } from "@/components/items/item-form";
import { PrivacyBadge } from "@/components/items/privacy-badge";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/profil/hinzufuegen")({
  head: () => pageHead("Teil hinzufügen", "Fotografiere ein Kleidungsstück für deinen Schrank."),
  component: AddItemPage,
});

function AddItemPage() {
  return (
    <div className="site-container page-body item-page">
      <h1 className="page-title">Teil hinzufügen</h1>
      <PrivacyBadge />
      <ItemForm />
    </div>
  );
}
