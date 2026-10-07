import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useConsent } from "@/hooks/use-consent";

export function ConsentBanner() {
  const { ready, decision } = useConsent();
  if (!ready || decision) return null;
  return <Banner />;
}

function Banner() {
  const { acceptAll, rejectAll, openSettings } = useConsent();
  const ref = useRef<HTMLDivElement>(null);

  // Reserve the banner's height below the page so it never covers the footer links.
  useEffect(() => {
    const banner = ref.current;
    if (!banner) return;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty("--consent-banner-height", `${banner.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(banner);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--consent-banner-height");
    };
  }, []);

  return (
    <div ref={ref} className="consent-banner" role="dialog" aria-label="Cookie-Einwilligung">
      <div className="site-container consent-banner-inner">
        <p className="consent-banner-text">
          Wir verwenden nur technisch notwendige Speicherungen. Statistik setzen wir ausschließlich
          mit deiner Einwilligung ein. Mehr in der{" "}
          <Link to="/datenschutz">Datenschutzerklärung</Link>.
        </p>
        <div className="consent-banner-actions">
          <Button type="button" variant="inverse" className="h-11 px-6" onClick={acceptAll}>
            Alle akzeptieren
          </Button>
          <Button type="button" variant="inverse" className="h-11 px-6" onClick={rejectAll}>
            Alle ablehnen
          </Button>
          <Button type="button" variant="menu" className="h-11 px-6" onClick={openSettings}>
            Einstellungen
          </Button>
        </div>
      </div>
    </div>
  );
}
