import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/layout/legal-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/agb")({
  head: () =>
    pageHead(
      "AGB",
      "Allgemeine Geschäftsbedingungen und Nutzungsbedingungen von Kleiderschrank Kompakt.",
    ),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Allgemeine Geschäftsbedingungen und Nutzungsbedingungen">
      <p>Die Nutzungsbedingungen werden vor dem offiziellen Start hier veröffentlicht.</p>
    </LegalPage>
  );
}
