import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { pageHead } from "@/config/site";

export const Route = createFileRoute("/login")({
  head: () => pageHead("Anmelden", "Die Anmeldeseite für deinen privaten Bereich bei Kleiderschrank Kompakt."),
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["mode"] === "string" ? { mode: search["mode"] } : {}),
  }),
  component: LoginPage,
});

function LoginPage() { return <PlaceholderPage title="Anmelden" />; }