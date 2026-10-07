import type { ReactNode } from "react";

export function AuthPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="site-container page-body auth-page">
      <h1 className="page-title">{title}</h1>
      {children}
    </div>
  );
}

// Announced to screen readers as soon as it appears.
export function AuthMessage({ children }: { children: ReactNode }) {
  return (
    <p className="auth-message" role="alert">
      {children}
    </p>
  );
}
