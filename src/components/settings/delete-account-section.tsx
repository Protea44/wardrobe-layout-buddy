import { useId, useState, type FormEvent } from "react";

import { ACCOUNT_DELETE_CONFIRMATION, type AccountResponse } from "@shared/account";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ACCOUNT_DELETED_PARAM, accountDeletionScope } from "@/config/account";
import { clearLocalData, deleteAccount } from "@/lib/account-api";
import { useOnline } from "@/lib/offline/online";
import { clearOfflineData } from "@/lib/offline/session";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

const WRONG_PASSWORD = "Das Passwort ist nicht richtig.";
const SIGN_IN_AGAIN = "Bitte melde dich zur Sicherheit erneut mit Google an.";

// Ends with a full page load, so no cached data of the account survives.
async function leaveDeletedAccount() {
  clearLocalData();
  await clearOfflineData().catch(() => {});
  window.location.replace(`/?${ACCOUNT_DELETED_PARAM}=1`);
}

// account is null while the profile cannot be loaded, e.g. offline.
export function DeleteAccountSection({ account }: { account: AccountResponse | null }) {
  const id = useId();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = confirmation === ACCOUNT_DELETE_CONFIRMATION;
  const hasPassword = account?.hasPassword ?? true;
  const ready = confirmed && (!hasPassword || password !== "");

  function reset(next: boolean) {
    if (deleting) return;
    setOpen(next);
    if (!next) {
      setConfirmation("");
      setPassword("");
      setError(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    setError(null);
    setDeleting(true);
    try {
      await deleteAccount({
        confirm: ACCOUNT_DELETE_CONFIRMATION,
        ...(hasPassword && { password }),
      });
      await leaveDeletedAccount();
    } catch (caught) {
      setDeleting(false);
      if (caught instanceof ApiError && caught.status === 403) {
        setError(hasPassword ? WRONG_PASSWORD : SIGN_IN_AGAIN);
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Dein Konto konnte nicht gelöscht werden. Bitte versuche es erneut.",
        );
      }
    }
  }

  function signInAgain() {
    void authClient.signIn.social({ provider: "google", callbackURL: "/profil/einstellungen" });
  }

  return (
    <section className="settings-section danger-zone" aria-labelledby="settings-delete">
      <h2 id="settings-delete" className="receipt-section-title">
        Konto löschen
      </h2>
      <p className="receipt-section-text">
        Dein Konto und alle Daten werden sofort und endgültig gelöscht. Lade vorher deinen
        Datenexport herunter, wenn du etwas behalten möchtest.
      </p>
      <Dialog open={open} onOpenChange={reset}>
        <DialogTrigger asChild>
          <Button
            type="button"
            className="h-11 justify-self-start px-6"
            disabled={!online || account === null}
          >
            Konto löschen
          </Button>
        </DialogTrigger>
        {!online && (
          <p className="offline-note">Dein Konto kannst du nur mit Internetverbindung löschen.</p>
        )}
        <DialogContent className="delete-account-dialog">
          <form onSubmit={(event) => void submit(event)} noValidate>
            <DialogHeader>
              <DialogTitle className="dialog-title">Konto endgültig löschen?</DialogTitle>
              <DialogDescription>Gelöscht werden:</DialogDescription>
            </DialogHeader>
            <ul className="delete-account-scope">
              {accountDeletionScope.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
            <p className="receipt-muted">Das lässt sich nicht rückgängig machen.</p>

            <div className="settings-field">
              <label htmlFor={`${id}-confirm`} className="settings-label">
                Gib „{ACCOUNT_DELETE_CONFIRMATION}“ ein, um zu bestätigen.
              </label>
              <Input
                id={`${id}-confirm`}
                className="h-11"
                value={confirmation}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>

            {hasPassword ? (
              <div className="settings-field">
                <label htmlFor={`${id}-password`} className="settings-label">
                  Dein Passwort
                </label>
                <Input
                  id={`${id}-password`}
                  type="password"
                  className="h-11"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            ) : (
              <div className="settings-field">
                <p className="receipt-muted">
                  Zur Sicherheit musst du dich kurz vorher erneut mit Google anmelden.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 justify-self-start"
                  onClick={signInAgain}
                >
                  Erneut mit Google anmelden
                </Button>
              </div>
            )}

            {error !== null && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <DialogFooter className="delete-account-actions">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={deleting}
                onClick={() => reset(false)}
              >
                Abbrechen
              </Button>
              <Button type="submit" className="h-11" disabled={!ready || deleting}>
                {deleting ? "Wird gelöscht …" : "Konto endgültig löschen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
