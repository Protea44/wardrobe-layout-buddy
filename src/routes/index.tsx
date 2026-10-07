import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/hero";
import { Benefits } from "@/components/home/benefits";
import { HowItWorks } from "@/components/home/how-it-works";
import { ClosingCta } from "@/components/home/closing-cta";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Startseite",
      "Dein privater Kleiderschrank im Netz: Kleidung in Sekunden erfassen, Kaufbelege aufbewahren und alles wiederfinden.",
    ),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="home">
      <Hero />
      <Benefits />
      <HowItWorks />
      <ClosingCta />
    </div>
  );
}
