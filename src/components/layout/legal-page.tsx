import type { ReactNode } from "react";
import { LEGAL_DRAFT, legalDraftNotice, legalProvider } from "@/config/legal";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="site-container page-body legal-page">
      {LEGAL_DRAFT && (
        <p className="legal-notice" role="note">
          {legalDraftNotice}
        </p>
      )}
      <h1 className="page-title">{title}</h1>
      <div className="legal-content">{children}</div>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="legal-section">
      <h2 className="legal-heading">{title}</h2>
      {children}
    </section>
  );
}

export function ProviderAddress() {
  const { name, street, zip, city, country } = legalProvider;
  return (
    <address className="legal-address">
      {name}
      <br />
      {street}
      <br />
      {zip} {city}
      <br />
      {country}
    </address>
  );
}
