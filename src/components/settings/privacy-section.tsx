import { Lock } from "lucide-react";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { useConsent } from "@/hooks/use-consent";

export function PrivacySection() {
  const id = useId();
  const { openSettings } = useConsent();

  return (
    <section className="settings-section" aria-labelledby="settings-privacy">
      <h2 id="settings-privacy" className="receipt-section-title">
        Privatsphäre
      </h2>
      <div className="privacy-card">
        <Lock aria-hidden="true" className="privacy-card-icon" />
        <p>
          Alle deine Teile, Fotos, Belege und Outfits sind privat. Niemand außer dir kann sie sehen.
        </p>
      </div>
      <div className="settings-field">
        <label htmlFor={`${id}-visibility`} className="wardrobe-field-label">
          Sichtbarkeit neuer Teile
        </label>
        <select
          id={`${id}-visibility`}
          className="wardrobe-input wardrobe-select settings-select"
          value="PRIVATE"
          disabled
          aria-describedby={`${id}-visibility-note`}
          onChange={() => {}}
        >
          <option value="PRIVATE">Privat</option>
        </select>
        <p id={`${id}-visibility-note`} className="receipt-muted">
          Weitere Optionen folgen.
        </p>
      </div>
      <Button
        type="button"
        variant="link"
        size="link"
        className="settings-link"
        onClick={openSettings}
      >
        Cookie-Einstellungen
      </Button>
    </section>
  );
}
