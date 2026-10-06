import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="logo-placeholder" aria-label="Kleiderschrank Kompakt – Startseite">
      {/* Replace this span with a local SVG or PNG when the logo is available. */}
      <span aria-hidden="true">Logo</span>
    </Link>
  );
}