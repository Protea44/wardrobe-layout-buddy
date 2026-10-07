import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { legalNavigation, primaryNavigation, siteConfig } from "@/config/site";
import { useConsent } from "@/hooks/use-consent";

export function Footer() {
  const { openSettings } = useConsent();

  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-columns">
          <div>
            <p className="footer-brand">{siteConfig.name}</p>
            <p className="footer-tagline">{siteConfig.tagline}</p>
          </div>
          <nav aria-labelledby="footer-navigation-heading">
            <h2 id="footer-navigation-heading" className="footer-heading">
              Navigation
            </h2>
            <div className="footer-links">
              {primaryNavigation.map((item) => (
                <Link key={item.to} to={item.to} className="footer-link">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
          <nav aria-labelledby="footer-legal-heading">
            <h2 id="footer-legal-heading" className="footer-heading">
              Rechtliches
            </h2>
            <div className="footer-links">
              {legalNavigation.map((item) => (
                <Link key={item.to} to={item.to} className="footer-link">
                  {item.label}
                </Link>
              ))}
              <Button type="button" variant="footerLink" size="link" onClick={openSettings}>
                Cookie-Einstellungen
              </Button>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} {siteConfig.name}
        </div>
      </div>
    </footer>
  );
}
