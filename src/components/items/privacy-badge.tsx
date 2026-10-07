import { Lock } from "lucide-react";

// Reminds the user that a new item is visible to nobody else.
export function PrivacyBadge() {
  return (
    <p className="privacy-note">
      <span className="privacy-badge">
        <Lock aria-hidden="true" />
        Privat
      </span>
      <span className="privacy-text">Nur du siehst dieses Teil.</span>
    </p>
  );
}
