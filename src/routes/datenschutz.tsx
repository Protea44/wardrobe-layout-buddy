import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection, ProviderAddress } from "@/components/layout/legal-page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { emailHref, legalProvider, phoneHref, storageEntries } from "@/config/legal";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/datenschutz")({
  head: () =>
    pageHead(
      "Datenschutz",
      "Informationen zum Datenschutz und zum Umgang mit Daten bei Kleiderschrank Kompakt.",
    ),
  component: PrivacyPage,
});

const revisionFormat = new Intl.DateTimeFormat("de-DE", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Berlin",
});

function PrivacyPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <LegalSection title="1. Verantwortlicher">
        <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
        <ProviderAddress />
        <p>
          Telefon: <a href={phoneHref}>{legalProvider.phone}</a>
          <br />
          E-Mail: <a href={emailHref}>{legalProvider.email}</a>
        </p>
      </LegalSection>

      <LegalSection title="2. Hosting">
        <p>
          Diese Website wird bei einem externen Dienstleister gehostet: [Hosting-Anbieter
          eintragen]. Die Daten, die beim Besuch der Website anfallen, werden auf dessen Servern
          verarbeitet.
        </p>
      </LegalSection>

      <LegalSection title="3. Server-Logfiles">
        <p>
          Bei jedem Aufruf der Website werden automatisch Informationen erfasst, die dein Browser
          übermittelt: IP-Adresse, Datum und Uhrzeit des Zugriffs, aufgerufene Seite, Referrer-URL
          sowie Browsertyp und Betriebssystem.
        </p>
        <p>
          Die Verarbeitung erfolgt auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes
          Interesse liegt im sicheren und stabilen Betrieb der Website.
        </p>
      </LegalSection>

      <LegalSection title="4. Nutzerkonto und Anmeldung">
        <p>
          Für dein Nutzerkonto und die Anmeldung nutzen wir Supabase. Die Daten werden in der
          EU-Region Frankfurt gespeichert. Die Verarbeitung erfolgt zur Erfüllung des
          Nutzungsvertrags nach Art. 6 Abs. 1 lit. b DSGVO.
        </p>
        <p>
          Optional kannst du dich mit deinem Google-Konto anmelden. Dabei können Daten in die USA
          übermittelt werden. Grundlage der Übermittlung ist das EU-US Data Privacy Framework.
        </p>
      </LegalSection>

      <LegalSection title="5. Gespeicherte Inhalte">
        <p>
          In deinem Konto speichern wir die Inhalte, die du selbst hochlädst oder einträgst: Fotos,
          Belege und Angaben zu deinen Kleidungsstücken.
        </p>
        <p>
          Standortdaten in Fotos werden vor dem Hochladen entfernt. Alle Inhalte sind standardmäßig
          privat.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies und lokale Speicherung">
        <p>
          Wir speichern nur Informationen auf deinem Gerät, die für den Betrieb der Website
          notwendig sind (§ 25 TDDDG).
        </p>
        <Table className="legal-table">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Zweck</TableHead>
              <TableHead>Kategorie</TableHead>
              <TableHead>Speicherdauer</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {storageEntries.map(({ name, purpose, category, duration }) => (
              <TableRow key={name}>
                <TableCell>{name}</TableCell>
                <TableCell>{purpose}</TableCell>
                <TableCell>{category}</TableCell>
                <TableCell>{duration}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p>
          Derzeit ist kein Statistikdienst aktiv. Ein solcher wird nur nach deiner Einwilligung
          geladen (Art. 6 Abs. 1 lit. a DSGVO).
        </p>
      </LegalSection>

      <LegalSection title="7. Speicherdauer">
        <p>
          Wir speichern deine Daten, solange dein Nutzerkonto besteht. Nach der Löschung deines
          Kontos werden sie entfernt, soweit keine gesetzlichen Aufbewahrungspflichten
          entgegenstehen.
        </p>
      </LegalSection>

      <LegalSection title="8. Empfänger und Auftragsverarbeiter">
        <p>
          Deine Daten werden nur an Dienstleister weitergegeben, die sie in unserem Auftrag
          verarbeiten:
        </p>
        <ul>
          <li>Hosting: [Hosting-Anbieter eintragen]</li>
          <li>Supabase: Nutzerkonto, Anmeldung und Speicherung deiner Inhalte</li>
          <li>Google: nur, wenn du die Anmeldung mit Google nutzt</li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Deine Rechte">
        <p>Nach Art. 15–21 DSGVO hast du das Recht auf:</p>
        <ul>
          <li>Auskunft über deine gespeicherten Daten (Art. 15)</li>
          <li>Berichtigung unrichtiger Daten (Art. 16)</li>
          <li>Löschung (Art. 17)</li>
          <li>Einschränkung der Verarbeitung (Art. 18)</li>
          <li>Datenübertragbarkeit (Art. 20)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
        </ul>
        <p>
          Eine erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen.
          Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren.
        </p>
      </LegalSection>

      <LegalSection title="10. Datenexport und Kontolöschung in der App">
        <p>
          Du kannst deine Daten in der App exportieren und dein Konto dort selbst löschen. Mit der
          Löschung des Kontos werden auch deine gespeicherten Inhalte entfernt.
        </p>
      </LegalSection>

      <p className="legal-revision">Stand: {revisionFormat.format(new Date())}</p>
    </LegalPage>
  );
}
