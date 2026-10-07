import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PASSWORD_MIN_LENGTH, resetPasswordSchema, type ResetPasswordInput } from "@shared/auth";

import { AuthMessage, AuthPage } from "@/components/auth/auth-page";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { authErrorMessage } from "@/config/auth";
import { pageHead } from "@/config/site";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/passwort-zuruecksetzen")({
  head: () => ({
    meta: [
      ...pageHead(
        "Passwort zurücksetzen",
        "Lege ein neues Passwort für dein Konto bei Kleiderschrank Kompakt fest.",
      ).meta,
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    ...(typeof search["token"] === "string" ? { token: search["token"] } : {}),
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  if (token === undefined) {
    return (
      <AuthPage title="Passwort zurücksetzen">
        <AuthMessage>
          Dieser Link ist unvollständig. Bitte fordere einen neuen Link zum Zurücksetzen an.
        </AuthMessage>
        <p className="auth-links">
          <Link to="/passwort-vergessen">Neuen Link anfordern</Link>
        </p>
      </AuthPage>
    );
  }

  if (done) {
    return (
      <AuthPage title="Passwort zurücksetzen">
        <AuthMessage>
          Dein neues Passwort ist gespeichert. Du kannst dich jetzt damit anmelden.
        </AuthMessage>
        <p className="auth-links">
          <Link to="/login">Zur Anmeldung</Link>
        </p>
      </AuthPage>
    );
  }

  async function onSubmit({ password }: ResetPasswordInput) {
    if (token === undefined) return;
    setError(null);
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) {
      setError(authErrorMessage(result.error));
      return;
    }
    setDone(true);
  }

  return (
    <AuthPage title="Passwort zurücksetzen">
      <Form {...form}>
        <form className="auth-form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
          {error !== null && <AuthMessage>{error}</AuthMessage>}
          <TextField
            control={form.control}
            name="password"
            label="Neues Passwort"
            type="password"
            autoComplete="new-password"
            hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`}
          />
          <Button type="submit" className="h-12 text-base" disabled={form.formState.isSubmitting}>
            Passwort speichern
          </Button>
          <p className="auth-links">
            <Link to="/passwort-vergessen">Neuen Link anfordern</Link>
          </p>
        </form>
      </Form>
    </AuthPage>
  );
}
