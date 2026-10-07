import { useEffect } from "react";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { ConsentSettings } from "@/components/consent/consent-settings";
import { loadAnalytics } from "@/lib/consent";

export function ConsentManager() {
  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <>
      <ConsentBanner />
      <ConsentSettings />
    </>
  );
}
