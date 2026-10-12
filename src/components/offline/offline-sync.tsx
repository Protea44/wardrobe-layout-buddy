import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { onSynced, syncOutbox } from "@/lib/offline/outbox";

// Sends queued offline changes when the app starts and whenever the
// connection returns, then reloads what the pages show.
export function OfflineSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const sync = () => void syncOutbox();
    const stop = onSynced(() => void queryClient.invalidateQueries());
    sync();
    window.addEventListener("online", sync);
    return () => {
      stop();
      window.removeEventListener("online", sync);
    };
  }, [queryClient]);

  return null;
}
