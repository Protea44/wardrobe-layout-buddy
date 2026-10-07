import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/kaufen")({
  head: () =>
    pageHead(
      "Kleidung kaufen",
      "Bald kannst du bei Kleiderschrank Kompakt Teile aus anderen Schränken entdecken.",
    ),
  component: BuyingPage,
});

function BuyingPage() {
  return (
    <div className="site-container page-body coming-soon">
      <h1 className="page-title">Kleidung kaufen</h1>
      <p className="coming-soon-text">
        Hier kannst du bald Teile aus anderen Schränken entdecken. Wir arbeiten daran.
      </p>
      <hr className="gold-divider" />
      <Button asChild className="h-12 px-9 text-base">
        <Link to="/profil/schrank">Zu meinem Schrank</Link>
      </Button>
    </div>
  );
}
