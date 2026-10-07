import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthMessage } from "@/components/auth/auth-page";
import { Button } from "@/components/ui/button";
import { authErrorMessage } from "@/config/auth";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/profil")({
  head: () => pageHead("Mein Profil", "Dein persönliches Profil bei Kleiderschrank Kompakt."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = Route.useRouteContext();
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
      <h1 className="page-title">Mein Profil</h1>
      <dl className="profile-details">
        <dt>Name</dt>
        <dd>{user.name}</dd>
        <dt>E-Mail-Adresse</dt>
        <dd>{user.email}</dd>
      </dl>
      {error !== null && <AuthMessage>{error}</AuthMessage>}
      <Button asChild className="profile-add-item h-11 px-6">
        <Link to="/teil-hinzufuegen">Teil hinzufügen</Link>
      </Button>
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
