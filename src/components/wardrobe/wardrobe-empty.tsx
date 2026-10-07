import { Link } from "@tanstack/react-router";
import { Camera, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";

export function WardrobeEmpty() {
  return (
    <div className="wardrobe-empty">
      <p className="wardrobe-empty-title">Dein Schrank ist noch leer.</p>
      <div className="wardrobe-empty-actions">
        <Button asChild className="h-12 px-6 text-base">
          <Link to="/profil/hinzufuegen">
            <Camera aria-hidden="true" />
            Foto aufnehmen
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 px-6 text-base">
          <Link to="/profil/hinzufuegen" search={{ tab: "beleg" }}>
            <FileText aria-hidden="true" />
            Beleg hochladen
          </Link>
        </Button>
      </div>
    </div>
  );
}
