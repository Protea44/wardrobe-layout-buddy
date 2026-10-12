import { createFileRoute } from "@tanstack/react-router";

import { OutfitEditor } from "@/components/outfits/outfit-editor";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/profil/outfits/neu")({
  head: () => pageHead("Neues Outfit", "Stell ein neues Outfit aus deinem Schrank zusammen."),
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
