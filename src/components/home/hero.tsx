import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { WardrobeArt } from "./wardrobe-art";

export function Hero() {
  return (
    <section className="home-hero" aria-labelledby="hero-title">
      <div className="site-container home-hero-inner">
        <div className="home-hero-copy">
          <h1 id="hero-title" className="home-title">
            Dein Kleiderschrank. Belegt, sortiert, griffbereit.
          </h1>
          <p className="home-subline">
            Erfasse deine Kleidung in Sekunden – per Foto oder Kaufbeleg. Privat,
            sicher und in der EU gespeichert.
          </p>
          <div className="home-actions">
            <Button asChild variant="inverse" className="h-12 px-9 text-base">
              <Link to="/login" search={{ mode: "register" }}>
                Schrank anlegen
              </Link>
            </Button>
            <a className="hero-scroll-link" href="#so-funktionierts">
              So funktioniert’s
            </a>
          </div>
        </div>
        <WardrobeArt />
      </div>
    </section>
  );
}
