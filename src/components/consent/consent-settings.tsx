import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { storageEntries } from "@/config/legal";
import { useConsent } from "@/hooks/use-consent";

export function ConsentSettings() {
  const { settingsOpen, setSettingsOpen } = useConsent();

  return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <SettingsForm />
      </DialogContent>
    </Dialog>
  );
}

// Mounted only while the modal is open, so the toggle always starts from the stored choice.
function SettingsForm() {
  const { statistics: stored, saveSelection } = useConsent();
  const [statistics, setStatistics] = useState(stored);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Cookie-Einstellungen</DialogTitle>
        <DialogDescription>
          Hier legst du fest, welche Speicherungen wir auf deinem Gerät verwenden dürfen.
        </DialogDescription>
      </DialogHeader>

      <div>
        <div className="consent-category">
          <div>
            <h3 id="consent-necessary" className="consent-category-title">
              Notwendig
            </h3>
            <p className="consent-category-text">
              Für den Betrieb der Website erforderlich und deshalb immer aktiv.
            </p>
            <ul className="consent-category-list">
              {storageEntries.map(({ name, purpose }) => (
                <li key={name}>
                  {name}: {purpose}
                </li>
              ))}
            </ul>
          </div>
          <Switch checked disabled aria-labelledby="consent-necessary" />
        </div>

        <div className="consent-category">
          <div>
            <h3 id="consent-statistics" className="consent-category-title">
              Statistik
            </h3>
            <p className="consent-category-text">
              Hilft uns zu verstehen, wie die Website genutzt wird. Derzeit ist kein Statistikdienst
              aktiv.
            </p>
          </div>
          <Switch
            checked={statistics}
            onCheckedChange={setStatistics}
            aria-labelledby="consent-statistics"
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" className="h-11 px-6" onClick={() => saveSelection(statistics)}>
          Auswahl speichern
        </Button>
      </DialogFooter>
    </>
  );
}
