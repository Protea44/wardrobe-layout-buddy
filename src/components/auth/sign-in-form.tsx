import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { signInSchema, type SignInInput } from "@shared/auth";

import { AuthMessage } from "@/components/auth/auth-page";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { authErrorMessage } from "@/config/auth";
import { authClient } from "@/lib/auth-client";

export function SignInForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInInput) {
    setError(null);
    const result = await authClient.signIn.email(values);
    if (result.error) {
      setError(authErrorMessage(result.error));
      return;
    }
    await navigate({ to: "/profil/schrank" });
  }

  return (
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
        <TextField
          control={form.control}
          name="password"
          label="Passwort"
          type="password"
          autoComplete="current-password"
        />
        <Button type="submit" className="h-12 text-base" disabled={form.formState.isSubmitting}>
          Anmelden
        </Button>
        <p className="auth-links">
          <Link to="/passwort-vergessen">Passwort vergessen?</Link>
          <Link to="/login" search={{ mode: "register" }}>
            Neues Konto erstellen
          </Link>
        </p>
      </form>
    </Form>
  );
}
