export const CONSENT_KEY = "kk_consent";
export const CONSENT_VERSION = 1;
const CONSENT_MAX_AGE_MONTHS = 12;

export type ConsentDecision = {
  version: number;
  timestamp: string;
  statistics: boolean;
};

export type ConsentState = {
  // false on the server and until the browser has read localStorage
  ready: boolean;
  decision: ConsentDecision | null;
  settingsOpen: boolean;
};

function isDecision(value: unknown): value is ConsentDecision {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ConsentDecision>;
  return (
    typeof candidate.version === "number" &&
    typeof candidate.timestamp === "string" &&
    typeof candidate.statistics === "boolean"
  );
}

export function isConsentCurrent(decision: ConsentDecision, now = new Date()) {
  if (decision.version < CONSENT_VERSION) return false;
  const expires = new Date(decision.timestamp);
  expires.setMonth(expires.getMonth() + CONSENT_MAX_AGE_MONTHS);
  return now < expires;
}

// Returns the stored decision, or null if the user has to be asked (again).
export function readConsent(): ConsentDecision | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (raw === null) return null;
    const value: unknown = JSON.parse(raw);
    return isDecision(value) && isConsentCurrent(value) ? value : null;
  } catch {
    return null;
  }
}

const serverState: ConsentState = { ready: false, decision: null, settingsOpen: false };
let state = serverState;
const listeners = new Set<() => void>();

function setState(patch: Partial<ConsentState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function syncFromStorage(event: StorageEvent) {
  if (event.key === CONSENT_KEY || event.key === null) setState({ decision: readConsent() });
}

export function subscribeConsent(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", syncFromStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", syncFromStorage);
  };
}

export function getConsentSnapshot() {
  if (!state.ready) state = { ...state, ready: true, decision: readConsent() };
  return state;
}

export function getConsentServerSnapshot() {
  return serverState;
}

export function saveConsent(statistics: boolean) {
  const decision: ConsentDecision = {
    version: CONSENT_VERSION,
    timestamp: new Date().toISOString(),
    statistics,
  };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(decision));
  } catch {
    // Storage unavailable: the decision still holds for this page view.
  }
  setState({ ready: true, decision, settingsOpen: false });
  loadAnalytics();
}

export function setConsentSettingsOpen(settingsOpen: boolean) {
  setState({ settingsOpen });
}

let analyticsLoaded = false;

export function loadAnalytics() {
  if (analyticsLoaded || readConsent()?.statistics !== true) return;
  analyticsLoaded = true;
  // TODO: Statistikdienst hier laden, sobald einer ausgewählt ist.
}
