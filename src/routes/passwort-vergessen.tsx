import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { requestPasswordResetSchema, type RequestPasswordResetInput } from "@shared/auth";

import { AuthMessage, AuthPage } from "@/components/auth/auth-page";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { authErrorMessage } from "@/config/auth";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/passwort-vergessen")({
  head: () =>
    pageHead(
      "Passwort vergessen",
      "Fordere einen Link an, um dein Passwort für Kleiderschrank Kompakt zurückzusetzen.",
    ),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(requestPasswordResetSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit({ email }: RequestPasswordResetInput) {
    setError(null);
    const result = await authClient.requestPasswordReset({ email });
    if (result.error) {
      setError(authErrorMessage(result.error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthPage title="Passwort vergessen">
        {/* Same answer whether or not the address has an account. */}
        <AuthMessage>
          Falls es zu dieser Adresse ein Konto gibt, haben wir dir eine E-Mail mit einem Link zum
          Zurücksetzen geschickt. Der Link ist eine Stunde gültig.
        </AuthMessage>
        <p className="auth-links">
          <Link to="/login">Zur Anmeldung</Link>
        </p>
      </AuthPage>
    );
  }

  return (
    <AuthPage title="Passwort vergessen">
      <p className="auth-intro">
        Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link, über den du ein neues Passwort
        festlegen kannst.
      </p>
      <Form {...form}>
        <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {error !== null && <AuthMessage>{error}</AuthMessage>}
          <TextField
            control={form.control}
            name="email"
            label="E-Mail-Adresse"
            type="email"
            autoComplete="email"
          />
          <Button type="submit" className="h-12 text-base" disabled={form.formState.isSubmitting}>
            Link anfordern
          </Button>
          <p className="auth-links">
            <Link to="/login">Zur Anmeldung</Link>
          </p>
        </form>
      </Form>
    </AuthPage>
  );
}
