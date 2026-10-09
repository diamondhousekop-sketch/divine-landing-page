// Client-safe UPI helpers (no secrets here — the UPI ID is shown to every payer).

// Standard VPA shape: handle@bank, e.g. diamondhouse@okaxis, 9876543210@ybl
export const UPI_ID_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,255}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

// 12-digit UPI transaction reference number.
export const UTR_REGEX = /^\d{12}$/;

export type UpiPublicConfig = { upi_id: string; payee_name: string };

// Builds the NPCI deep link that opens any UPI app (GPay / PhonePe / Paytm / BHIM)
// with the payee, amount and note pre-filled. `am` must have 2 decimals.
export function buildUpiLink(cfg: UpiPublicConfig, amount: number, orderNumber: string): string {
  // `pa` is kept raw (UPI_ID_REGEX allows only URL-safe chars) because some
  // older UPI apps fail on an encoded "@" (%40). Everything else is encoded.
  const q = [
    `pa=${cfg.upi_id}`,
    `pn=${encodeURIComponent(cfg.payee_name || "Diamond House")}`,
    `am=${amount.toFixed(2)}`,
    "cu=INR",
    `tn=${encodeURIComponent(`Order ${orderNumber}`.slice(0, 50))}`,
  ];
  return `upi://pay?${q.join("&")}`;
}
