import { createFileRoute, redirect } from "@tanstack/react-router";

import { OutfitEditor } from "@/components/outfits/outfit-editor";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/profil_/outfits/neu")({
  head: () => pageHead("Neues Outfit", "Stell ein neues Outfit aus deinem Schrank zusammen."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
  component: NewOutfitPage,
});

function NewOutfitPage() {
  return (
    <div className="site-container page-body">
      <h1 className="page-title">Neues Outfit</h1>
      <OutfitEditor outfit={null} />
    </div>
  );
}
