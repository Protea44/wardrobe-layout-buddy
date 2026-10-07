import { createFileRoute } from "@tanstack/react-router";

import { OutfitEditor } from "@/components/outfits/outfit-editor";
import { pageHead } from "@/config/site";
import { requireSession } from "@/lib/offline/session";

export const Route = createFileRoute("/profil_/outfits/neu")({
  head: () => pageHead("Neues Outfit", "Stell ein neues Outfit aus deinem Schrank zusammen."),
  // Private page; offline it shows the offline copy.
  beforeLoad: requireSession,
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
