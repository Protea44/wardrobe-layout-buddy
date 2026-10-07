import { createFileRoute, redirect } from "@tanstack/react-router";

import { ItemForm } from "@/components/items/item-form";
import { PrivacyBadge } from "@/components/items/privacy-badge";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/teil-hinzufuegen")({
  head: () => pageHead("Teil hinzufügen", "Fotografiere ein Kleidungsstück für deinen Schrank."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
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
