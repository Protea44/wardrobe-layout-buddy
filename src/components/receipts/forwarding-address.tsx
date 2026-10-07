import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { forwardingAddress } from "@/config/receipts";
import { ApiError } from "@/lib/api";
import { fetchForwardingAlias, receiptQueryKeys } from "@/lib/receipts-api";

export function ForwardingAddress() {
  const alias = useQuery({
    queryKey: receiptQueryKeys.forwardingAlias,
    queryFn: fetchForwardingAlias,
    // An alias never changes once it exists.
    staleTime: Infinity,
  });
  const address = alias.data === undefined ? null : forwardingAddress(alias.data);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Adresse kopiert");
    } catch {
      toast.error("Kopieren hat nicht geklappt. Bitte markiere die Adresse von Hand.");
    }
  }

  return (
    <section className="receipt-section" aria-labelledby="forwarding-heading">
      <div className="receipt-section-head">
        <h2 id="forwarding-heading" className="receipt-section-title">
          Deine Belegadresse
        </h2>
        <span className="status-badge">In Vorbereitung</span>
      </div>

      {alias.isPending && <p className="receipt-muted">Adresse wird geladen …</p>}
      {alias.isError && (
        <p className="form-error" role="alert">
          {alias.error instanceof ApiError
            ? alias.error.message
            : "Die Adresse konnte nicht geladen werden."}
        </p>
      )}
      {address !== null && (
        <div className="forwarding-address">
          <code className="forwarding-address-value">{address}</code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Adresse kopieren"
            onClick={() => copy(address)}
          >
            <Copy aria-hidden="true" />
          </Button>
        </div>
      )}

      <p className="receipt-section-text">
        Bald kannst du Bestellbestätigungen einfach an diese Adresse weiterleiten. Die Teile werden
        dann automatisch in deinem Schrank angelegt. Bis dahin kannst du Belege hier hochladen.
      </p>
    </section>
  );
}
