import { useSyncExternalStore } from "react";

import { ApiError } from "@/lib/api";

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

export function isOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

export function useOnline() {
  return useSyncExternalStore(subscribe, isOnline, () => true);
}

// No answer from the server at all, as opposed to an error answer.
export function isNetworkError(error: unknown) {
  return error instanceof ApiError && error.status === null;
}
