import { Download } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { downloadExport } from "@/lib/account-api";
import { useOnline } from "@/lib/offline/online";

export function ExportSection() {
  const online = useOnline();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function exportAll() {
    setError(null);
    setExporting(true);
    try {
      await downloadExport();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : "Der Export ist fehlgeschlagen. Bitte versuche es erneut.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="settings-section" aria-labelledby="settings-export">
      <h2 id="settings-export" className="receipt-section-title">
        Datenexport
      </h2>
      <p className="receipt-section-text">
        Du bekommst eine ZIP-Datei mit allen Angaben (daten.json), einer Tabelle deiner Teile
        (kleidung.csv) sowie allen Fotos und Belegen.
      </p>
      <p className="sr-only" role="status">
        {exporting ? "Dein Export wird erstellt." : ""}
      </p>
      {!online && <p className="offline-note">Der Export braucht eine Internetverbindung.</p>}
      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        className="h-11 justify-self-start px-6"
        disabled={exporting || !online}
        onClick={() => void exportAll()}
      >
        <Download aria-hidden="true" />
        {exporting ? "Export wird erstellt …" : "Alle Daten exportieren"}
      </Button>
    </section>
  );
}
