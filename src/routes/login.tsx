import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/auth-page";
import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["mode"] === "string" ? { mode: search["mode"] } : {}),
  }),
  head: ({ match }) =>
    match.search.mode === "register"
      ? pageHead(
          "Konto erstellen",
          "Lege dein Konto für deinen privaten Kleiderschrank bei Kleiderschrank Kompakt an.",
        )
      : pageHead(
          "Anmelden",
          "Die Anmeldeseite für deinen privaten Bereich bei Kleiderschrank Kompakt.",
        ),
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (data) throw redirect({ to: "/profil/schrank" });
  },
  component: LoginPage,
});

function LoginPage() {
  const { mode } = Route.useSearch();

  if (mode === "register") {
    return (
      <AuthPage title="Konto erstellen">
        <SignUpForm />
      </AuthPage>
    );
  }
  return (
    <AuthPage title="Anmelden">
      <SignInForm />
    </AuthPage>
  );
}
