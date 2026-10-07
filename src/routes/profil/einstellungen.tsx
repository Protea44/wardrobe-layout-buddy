import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthMessage } from "@/components/auth/auth-page";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/config/auth";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/profil/einstellungen")({
  head: () =>
    pageHead("Einstellungen", "Die Einstellungen deines Kontos bei Kleiderschrank Kompakt."),
  component: SettingsPage,
});

function SettingsPage() {
  const { me } = Route.useRouteContext();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function signOut() {
    setError(null);
    setPending(true);
    const result = await authClient.signOut();
    setPending(false);
    if (result.error) {
      setError(authErrorMessage(result.error));
      return;
    }
    await navigate({ to: "/" });
  }

  return (
    <div className="site-container page-body">
      <h1 className="page-title">Einstellungen</h1>
      <dl className="profile-details">
        <dt>Name</dt>
        <dd>{me.displayName}</dd>
        <dt>E-Mail-Adresse</dt>
        <dd>{me.email}</dd>
      </dl>
      {error !== null && <AuthMessage>{error}</AuthMessage>}
      <Button
        type="button"
        variant="outline"
        className="profile-sign-out h-11 px-6"
        onClick={signOut}
        disabled={pending}
      >
        Abmelden
      </Button>
    </div>
  );
}
