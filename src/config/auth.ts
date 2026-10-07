const CODE_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "E-Mail-Adresse oder Passwort stimmen nicht.",
  INVALID_EMAIL: "Bitte gib eine gültige E-Mail-Adresse ein.",
  INVALID_PASSWORD: "E-Mail-Adresse oder Passwort stimmen nicht.",
  USER_ALREADY_EXISTS: "Mit dieser E-Mail-Adresse gibt es bereits ein Konto.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "Mit dieser E-Mail-Adresse gibt es bereits ein Konto.",
  PASSWORD_TOO_SHORT: "Das Passwort ist zu kurz.",
  PASSWORD_TOO_LONG: "Das Passwort ist zu lang.",
  INVALID_TOKEN:
    "Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link zum Zurücksetzen an.",
};

const TOO_MANY_REQUESTS = "Zu viele Versuche. Bitte warte eine Minute und versuche es erneut.";
const NO_CONNECTION =
  "Keine Verbindung zum Server. Bitte prüfe deine Internetverbindung und versuche es erneut.";
const FALLBACK = "Etwas ist schiefgelaufen. Bitte versuche es später erneut.";

type AuthError = {
  code?: string | undefined;
  status?: number | undefined;
};

// German text for an error returned by the auth client.
export function authErrorMessage(error: AuthError): string {
  if (error.status === 429) return TOO_MANY_REQUESTS;
  const byCode = error.code !== undefined ? CODE_MESSAGES[error.code] : undefined;
  if (byCode !== undefined) return byCode;
  // The client reports a failed request without an HTTP status.
  if (error.status === undefined || error.status === 0) return NO_CONNECTION;
  return FALLBACK;
}
