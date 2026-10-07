import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/hero";
import { Benefits } from "@/components/home/benefits";
import { HowItWorks } from "@/components/home/how-it-works";
import { ClosingCta } from "@/components/home/closing-cta";
import { ACCOUNT_DELETED_PARAM } from "@/config/account";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { [ACCOUNT_DELETED_PARAM]?: true } =>
    search[ACCOUNT_DELETED_PARAM] === undefined ? {} : { [ACCOUNT_DELETED_PARAM]: true },
  head: () =>
    pageHead(
      "Startseite",
      "Dein privater Kleiderschrank im Netz: Kleidung in Sekunden erfassen, Kaufbelege aufbewahren und alles wiederfinden.",
    ),
  component: HomePage,
});

function HomePage() {
  const search = Route.useSearch();

  return (
    <div className="home">
      {search[ACCOUNT_DELETED_PARAM] && (
        <div className="site-container">
          <p className="account-deleted-notice" role="status">
            Dein Konto und alle Daten wurden gelöscht.
          </p>
        </div>
      )}
      <Hero />
      <Benefits />
      <HowItWorks />
      <ClosingCta />
    </div>
  );
}
