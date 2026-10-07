import { beforeEach, describe, expect, it } from "vitest";

import {
  CONSENT_KEY,
  CONSENT_VERSION,
  getConsentSnapshot,
  readConsent,
  saveConsent,
} from "@/lib/consent";

function store(decision: { version: number; timestamp: string; statistics: boolean }) {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(decision));
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.toISOString();
}

describe("consent storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("asks when nothing is stored", () => {
    expect(readConsent()).toBeNull();
  });

  it("returns a current decision", () => {
    store({ version: CONSENT_VERSION, timestamp: monthsAgo(11), statistics: true });

    expect(readConsent()?.statistics).toBe(true);
  });

  it("asks again when the stored version is lower than the current one", () => {
    store({ version: CONSENT_VERSION - 1, timestamp: monthsAgo(0), statistics: true });

    expect(readConsent()).toBeNull();
  });

  it("asks again when the decision is older than 12 months", () => {
    store({ version: CONSENT_VERSION, timestamp: monthsAgo(13), statistics: true });

    expect(readConsent()).toBeNull();
  });

  it("asks again when the stored value is malformed", () => {
    window.localStorage.setItem(CONSENT_KEY, "{not json");
    expect(readConsent()).toBeNull();

    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION }));
    expect(readConsent()).toBeNull();
  });

  it("saves the decision under kk_consent and closes the settings", () => {
    saveConsent(false);

    const stored: unknown = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? "null");
    expect(stored).toEqual({
      version: CONSENT_VERSION,
      timestamp: expect.any(String),
      statistics: false,
    });
    expect(getConsentSnapshot()).toMatchObject({
      decision: { statistics: false },
      settingsOpen: false,
    });
  });
});
