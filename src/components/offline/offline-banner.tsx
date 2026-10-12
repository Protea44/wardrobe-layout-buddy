import { WifiOff } from "lucide-react";

import { useOnline } from "@/lib/offline/online";

export function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="offline-banner" role="status">
      <div className="site-container offline-banner-inner">
        <WifiOff aria-hidden="true" />
        <p>Du bist offline. Änderungen werden synchronisiert, sobald du wieder online bist.</p>
      </div>
    </div>
  );
}
