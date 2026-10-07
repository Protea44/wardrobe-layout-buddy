import { Link } from "@tanstack/react-router";
import { primaryNavigation } from "@/config/site";
import { Logo } from "./logo";
import { MobileNavigation } from "./mobile-navigation";

export function Header() {
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Hauptnavigation">
          {primaryNavigation.map((item) => (
            <Link key={item.to} to={item.to} className="nav-link" activeOptions={{ exact: true }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <MobileNavigation />
      </div>
    </header>
  );
}
