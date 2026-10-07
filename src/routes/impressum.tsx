import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, LegalSection, ProviderAddress } from "@/components/layout/legal-page";
import { emailHref, legalProvider, phoneHref } from "@/config/legal";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/impressum")({
  head: () =>
    pageHead(
      "Impressum",
      "Die Seite für Anbieterangaben und rechtliche Informationen zu Kleiderschrank Kompakt.",
    ),
  component: ImprintPage,
});

function ImprintPage() {
  return (
    <LegalPage title="Impressum">
      <LegalSection title="Angaben gemäß § 5 DDG">
        <ProviderAddress />
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Telefon: <a href={phoneHref}>{legalProvider.phone}</a>
          <br />
          E-Mail: <a href={emailHref}>{legalProvider.email}</a>
        </p>
      </LegalSection>

      {legalProvider.vatId !== "" && (
        <LegalSection title="Umsatzsteuer-ID">
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:{" "}
            {legalProvider.vatId}
          </p>
        </LegalSection>
      )}

      <LegalSection title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <ProviderAddress />
      </LegalSection>
    </LegalPage>
  );
}
