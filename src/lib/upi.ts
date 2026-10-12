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

// ---- One-tap links for individual UPI apps -------------------------------------
export type UpiPlatform = "android" | "ios" | "other";

export function detectPlatform(ua: string): UpiPlatform {
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "other";
}

export type UpiApp = {
  id: "gpay" | "phonepe" | "paytm" | "bhim" | "cred";
  name: string;
  mono: string; // short monogram shown on the tile (we do not ship brand logos)
  androidPackage: string;
  iosPrefix: string; // scheme + path that precedes "?<upi params>"
};

export const UPI_APPS: UpiApp[] = [
  {
    id: "gpay",
    name: "Google Pay",
    mono: "G",
    androidPackage: "com.google.android.apps.nbu.paisa.user",
    iosPrefix: "gpay://upi/pay",
  },
  {
    id: "phonepe",
    name: "PhonePe",
    mono: "Pe",
    androidPackage: "com.phonepe.app",
    iosPrefix: "phonepe://pay",
  },
  {
    id: "paytm",
    name: "Paytm",
    mono: "Pt",
    androidPackage: "net.one97.paytm",
    iosPrefix: "paytmmp://pay",
  },
  {
    id: "bhim",
    name: "BHIM",
    mono: "B",
    androidPackage: "in.org.npci.upiapp",
    iosPrefix: "upi://pay",
  },
  {
    id: "cred",
    name: "CRED",
    mono: "C",
    androidPackage: "com.dreamplug.androidapp",
    iosPrefix: "credpay://upi/pay",
  },
];

// Deep link that opens ONE specific app with payee, fixed amount and order note
// already filled. Android uses an intent that targets the app's package; iOS uses the
// app's own URL scheme. Anything else falls back to the generic upi:// link.
export function buildAppLink(
  app: UpiApp,
  cfg: UpiPublicConfig,
  amount: number,
  orderNumber: string,
  platform: UpiPlatform,
): string {
  const generic = buildUpiLink(cfg, amount, orderNumber);
  const params = generic.slice("upi://pay?".length);
  if (platform === "android") {
    return `intent://pay?${params}#Intent;scheme=upi;package=${app.androidPackage};end`;
  }
  if (platform === "ios") return `${app.iosPrefix}?${params}`;
  return generic;
}
