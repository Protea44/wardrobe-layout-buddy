import { useSyncExternalStore } from "react";
import {
  getConsentServerSnapshot,
  getConsentSnapshot,
  saveConsent,
  setConsentSettingsOpen,
  subscribeConsent,
} from "@/lib/consent";

export function useConsent() {
  const { ready, decision, settingsOpen } = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );

  return {
    ready,
    decision,
    statistics: decision?.statistics === true,
    settingsOpen,
    acceptAll: () => saveConsent(true),
    rejectAll: () => saveConsent(false),
    saveSelection: saveConsent,
    openSettings: () => setConsentSettingsOpen(true),
    setSettingsOpen: setConsentSettingsOpen,
  };
}
