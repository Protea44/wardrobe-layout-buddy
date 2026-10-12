import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import type { ReceiptResponse } from "@shared/receipt";

import { ForwardingAddress } from "@/components/receipts/forwarding-address";
import { ReceiptItemsForm } from "@/components/receipts/receipt-items-form";
import { ReceiptList } from "@/components/receipts/receipt-list";
import { ReceiptUpload } from "@/components/receipts/receipt-upload";
import { receiptQueryKeys } from "@/lib/receipts-api";

export function ReceiptTab() {
  const queryClient = useQueryClient();
  // The uploaded receipt whose items are being entered.
  const [receipt, setReceipt] = useState<ReceiptResponse | null>(null);

  function refreshList() {
    void queryClient.invalidateQueries({ queryKey: receiptQueryKeys.list });
  }

  function handleUploaded(uploaded: ReceiptResponse) {
    setReceipt(uploaded);
    refreshList();
  }

  function handleSaved() {
    toast.success("Gespeichert");
    setReceipt(null);
    refreshList();
  }

  return (
    <div className="receipt-tab">
      <ForwardingAddress />
      <section className="receipt-section" aria-labelledby="receipt-upload-heading">
        <h2 id="receipt-upload-heading" className="receipt-section-title">
          Beleg hochladen
        </h2>
        {receipt === null ? (
          <ReceiptUpload onUploaded={handleUploaded} />
        ) : (
          <ReceiptItemsForm
            key={receipt.id}
            receipt={receipt}
            onSaved={handleSaved}
            onCancel={() => setReceipt(null)}
          />
        )}
      </section>
      <ReceiptList />
    </div>
  );
}
