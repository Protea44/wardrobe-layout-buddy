import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { AccountResponse } from "@shared/account";
import { profileNameSchema, type ProfileNameInput } from "@shared/auth";

import { AuthMessage } from "@/components/auth/auth-page";
import { TextField } from "@/components/auth/text-field";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { authErrorMessage } from "@/config/auth";
import { accountQueryKey } from "@/lib/account-api";
import { authClient } from "@/lib/auth-client";
import { signOutCompletely } from "@/lib/offline/session";

export function ProfileSection({ account }: { account: AccountResponse }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const form = useForm<ProfileNameInput>({
    resolver: zodResolver(profileNameSchema),
    defaultValues: { name: account.name },
  });

  async function saveName(values: ProfileNameInput) {
    setError(null);
    const result = await authClient.updateUser({ name: values.name });
    if (result.error) {
      setError(authErrorMessage(result.error));
      return;
    }
    queryClient.setQueryData<AccountResponse>(accountQueryKey, { ...account, name: values.name });
    form.reset(values);
    toast.success("Gespeichert");
  }

  async function signOut() {
    setError(null);
    setSigningOut(true);
    const failure = await signOutCompletely();
    setSigningOut(false);
    if (failure !== null) {
      setError(failure);
      return;
    }
    queryClient.clear();
    await navigate({ to: "/" });
  }

  return (
    <section className="settings-section" aria-labelledby="settings-profile">
      <h2 id="settings-profile" className="receipt-section-title">
        Profil
      </h2>
      <Form {...form}>
        <form className="settings-form" onSubmit={form.handleSubmit(saveName)} noValidate>
          {error !== null && <AuthMessage>{error}</AuthMessage>}
          <TextField
            control={form.control}
            name="name"
            label="Anzeigename"
            autoComplete="name"
            maxLength={100}
          />
          <div className="settings-field">
            <p className="wardrobe-field-label">E-Mail-Adresse</p>
            <p className="settings-readonly">{account.email}</p>
          </div>
          <div className="settings-buttons">
            <Button
              type="submit"
              className="h-11 px-6"
              disabled={form.formState.isSubmitting || !form.formState.isDirty}
            >
              Namen speichern
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6"
              disabled={signingOut}
              onClick={() => void signOut()}
            >
              Abmelden
            </Button>
          </div>
        </form>
      </Form>
    </section>
  );
}
