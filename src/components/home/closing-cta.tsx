import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function ClosingCta() {
  return (
    <section className="home-cta" aria-labelledby="cta-title">
      <div className="site-container home-cta-inner">
        <h2 id="cta-title" className="home-cta-title">
          Bereit für mehr Ordnung?
        </h2>
        <Button asChild variant="inverse" className="h-12 px-9 text-base">
          <Link to="/login" search={{ mode: "register" }}>
            Schrank anlegen
          </Link>
        </Button>
      </div>
    </section>
  );
}
