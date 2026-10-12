import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";

import type { ReceiptSummary } from "@shared/receipt";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { fetchReceipts, receiptFileUrl, receiptQueryKeys } from "@/lib/receipts-api";

function merchantLabel(receipt: ReceiptSummary) {
  if (receipt.merchant !== null) return receipt.merchant;
  return receipt.source === "EMAIL" ? "Per E-Mail erhalten" : "Händler nicht angegeben";
}

function ReceiptRow({ receipt }: { receipt: ReceiptSummary }) {
  const date = formatDate(receipt.purchaseDate ?? receipt.receivedAt);
  const merchant = merchantLabel(receipt);

  return (
    <li className="receipt-row">
      <div className="receipt-row-text">
        <p className="receipt-row-merchant">{merchant}</p>
        <p className="receipt-muted">
          {date} · {receipt.itemCount === 1 ? "1 Teil" : `${receipt.itemCount} Teile`}
        </p>
      </div>
      <Button asChild variant="outline" className="h-11 shrink-0 px-4">
        <a href={receiptFileUrl(receipt.fileKey)} target="_blank" rel="noopener noreferrer">
          Ansehen
          <span className="sr-only">
            : Beleg {merchant} vom {date} (öffnet in neuem Tab)
          </span>
          <ExternalLink aria-hidden="true" />
        </a>
      </Button>
    </li>
  );
}

export function ReceiptList() {
  const receipts = useQuery({ queryKey: receiptQueryKeys.list, queryFn: fetchReceipts });

  return (
    <section className="receipt-section" aria-labelledby="receipt-list-heading">
      <h2 id="receipt-list-heading" className="receipt-section-title">
        Meine Belege
      </h2>
      {receipts.isPending && <p className="receipt-muted">Belege werden geladen …</p>}
      {receipts.isError && (
        <p className="form-error" role="alert">
          {receipts.error instanceof ApiError
            ? receipts.error.message
            : "Deine Belege konnten nicht geladen werden."}
        </p>
      )}
      {receipts.data?.length === 0 && (
        <p className="receipt-muted">Du hast noch keine Belege hochgeladen.</p>
      )}
      {receipts.data !== undefined && receipts.data.length > 0 && (
        <ul className="receipt-rows">
          {receipts.data.map((receipt) => (
            <ReceiptRow key={receipt.id} receipt={receipt} />
          ))}
        </ul>
      )}
    </section>
  );
}
