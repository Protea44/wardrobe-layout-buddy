import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";

import { formatDate } from "@/lib/format";
import { fetchReceipt, receiptFileUrl, receiptQueryKeys } from "@/lib/receipts-api";

// The receipt an item was bought with: merchant, date and a link to the file.
export function ItemReceipt({ receiptId }: { receiptId: string }) {
  const receipt = useQuery({
    queryKey: receiptQueryKeys.detail(receiptId),
    queryFn: () => fetchReceipt(receiptId),
  });
  if (!receipt.data) return null;

  const { merchant, purchaseDate, receivedAt, fileKey } = receipt.data;
  const date = formatDate(purchaseDate ?? receivedAt);

  return (
    <div className="item-receipt">
      <FileText aria-hidden="true" className="item-receipt-icon" />
      <div className="item-receipt-text">
        <p className="item-receipt-title">Beleg{merchant !== null && <> von {merchant}</>}</p>
        <p className="receipt-muted">vom {date}</p>
      </div>
      <a
        className="item-receipt-link"
        href={receiptFileUrl(fileKey)}
        target="_blank"
        rel="noopener noreferrer"
      >
        Beleg ansehen
        <span className="sr-only"> (öffnet in neuem Tab)</span>
        <ExternalLink aria-hidden="true" />
      </a>
    </div>
  );
}
