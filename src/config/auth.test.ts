import { describe, expect, it } from "vitest";

import { authErrorMessage } from "@/config/auth";

describe("authErrorMessage", () => {
  it("translates known error codes", () => {
    expect(authErrorMessage({ code: "INVALID_EMAIL_OR_PASSWORD", status: 401 })).toBe(
      "E-Mail-Adresse oder Passwort stimmen nicht.",
    );
    expect(authErrorMessage({ code: "USER_ALREADY_EXISTS", status: 422 })).toBe(
      "Mit dieser E-Mail-Adresse gibt es bereits ein Konto.",
    );
  });

  it("explains the rate limit regardless of the code", () => {
    expect(authErrorMessage({ code: "ANYTHING", status: 429 })).toMatch(/Zu viele Versuche/);
  });

  it("reports a missing connection when there is no HTTP status", () => {
    expect(authErrorMessage({})).toMatch(/Keine Verbindung/);
    expect(authErrorMessage({ status: 0 })).toMatch(/Keine Verbindung/);
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(authErrorMessage({ code: "SOMETHING_NEW", status: 500 })).toBe(
      "Etwas ist schiefgelaufen. Bitte versuche es später erneut.",
    );
  });
});
