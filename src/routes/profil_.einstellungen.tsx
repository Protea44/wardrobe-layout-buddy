import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { DeleteAccountSection } from "@/components/settings/delete-account-section";
import { ExportSection } from "@/components/settings/export-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { ProfileSection } from "@/components/settings/profile-section";
import { pageHead } from "@/config/site";
import { accountQueryKey, fetchAccount } from "@/lib/account-api";
import { ApiError } from "@/lib/api";
import { isNetworkError } from "@/lib/offline/online";
import { requireSession } from "@/lib/offline/session";

export const Route = createFileRoute("/profil_/einstellungen")({
  head: () =>
    pageHead("Einstellungen", "Profil, Privatsphäre, Datenexport und Löschung deines Kontos."),
  // Private page; offline it shows the offline copy.
  beforeLoad: requireSession,
  component: SettingsPage,
});

function SettingsPage() {
  const account = useQuery({ queryKey: accountQueryKey, queryFn: fetchAccount });

  return (
    <div className="site-container page-body settings-page">
      <h1 className="page-title">Einstellungen</h1>
      <div className="settings-sections">
        {account.data ? (
          <ProfileSection account={account.data} />
        ) : (
          <section className="settings-section" aria-labelledby="settings-profile">
            <h2 id="settings-profile" className="receipt-section-title">
              Profil
            </h2>
            {account.isPending && <p className="receipt-muted">Wird geladen …</p>}
            {account.isError && (
              <p className="form-error" role="alert">
                {isNetworkError(account.error)
                  ? "Dein Profil ist offline nicht verfügbar."
                  : account.error instanceof ApiError
                    ? account.error.message
                    : "Deine Einstellungen konnten nicht geladen werden."}
              </p>
            )}
          </section>
        )}
        {/* Privacy and export work without the profile; both explain themselves offline. */}
        <PrivacySection />
        <ExportSection />
        <DeleteAccountSection account={account.data ?? null} />
      </div>
    </div>
  );
}
