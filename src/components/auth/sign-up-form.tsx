import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { PASSWORD_MIN_LENGTH, signUpSchema, type SignUpInput } from "@shared/auth";

import { AuthMessage } from "@/components/auth/auth-page";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { authErrorMessage } from "@/config/auth";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: SignUpInput) {
    setError(null);
    const result = await authClient.signUp.email(values);
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
        <TextField control={form.control} name="name" label="Name" autoComplete="name" />
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
          autoComplete="new-password"
          hint={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`}
        />
        <Button type="submit" className="h-12 text-base" disabled={form.formState.isSubmitting}>
          Konto erstellen
        </Button>
        <p className="auth-links">
          <Link to="/login">Ich habe schon ein Konto</Link>
        </p>
      </form>
    </Form>
  );
}
