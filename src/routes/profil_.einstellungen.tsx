import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { ExportSection } from "@/components/settings/export-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { pageHead } from "@/config/site";
import { accountQueryKey, fetchAccount } from "@/lib/account-api";
import { ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/profil_/einstellungen")({
  head: () =>
    pageHead("Einstellungen", "Profil, Privatsphäre, Datenexport und Löschung deines Kontos."),
  // Private page: without a session the visitor is sent to the login.
  beforeLoad: async () => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/login" });
  },
  component: SettingsPage,
});

function SettingsPage() {
  const account = useQuery({ queryKey: accountQueryKey, queryFn: fetchAccount });

  return (
    <div className="site-container page-body settings-page">
      <h1 className="page-title">Einstellungen</h1>
      {account.isPending && <p className="receipt-muted">Wird geladen …</p>}
      {account.isError && (
        <p className="form-error" role="alert">
          {account.error instanceof ApiError
            ? account.error.message
            : "Deine Einstellungen konnten nicht geladen werden."}
        </p>
      )}
      {account.data && (
        <div className="settings-sections">
          <ProfileSection account={account.data} />
          <PrivacySection />
          <ExportSection />
          <DeleteAccountSection account={account.data} />
        </div>
      )}
    </div>
  );
}
