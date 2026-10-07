// Domain of the receipt forwarding addresses. Must match RECEIPT_EMAIL_DOMAIN
// in the backend environment.
export const RECEIPT_EMAIL_DOMAIN = "belege.kleiderschrank-kompakt.de";

export function forwardingAddress(alias: string) {
  return `${alias}@${RECEIPT_EMAIL_DOMAIN}`;
}

// File picker filter for receipts; the server checks the real type.
export const RECEIPT_FILE_ACCEPT = "application/pdf,.pdf,image/jpeg,image/png";
