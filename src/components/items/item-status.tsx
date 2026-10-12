import { Lock } from "lucide-react";

// Sharing, sale and trade come later; until then every item is private.
export function ItemStatus() {
  return (
    <div className="item-status">
      <p className="item-status-line">
        <Lock aria-hidden="true" />
        Privat – nur du siehst dieses Teil.
      </p>
      <p className="item-status-hint">Freigaben folgen in einer späteren Version.</p>
    </div>
  );
}
