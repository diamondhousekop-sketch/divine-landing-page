// Shipping + COD fee rules. Pure and client-safe: the checkout uses it for a live
// preview and the server (/api/orders) uses the SAME function as the source of truth,
// so the amount the customer sees is exactly the amount that is charged.

export type ShippingZone = { label: string; prefixes: string[]; fee: number };

export type ShippingConfig = {
  enabled: boolean; // false = free delivery everywhere (the default)
  flat_fee: number; // charged when no zone matches the pincode
  free_above: number; // items total at/above which delivery is free (0 = never)
  cod_fee: number; // extra handling fee for Cash on Delivery
  zones: ShippingZone[]; // first matching pincode prefix wins
  note: string; // optional line shown under the shipping row
};

export const DEFAULT_SHIPPING: ShippingConfig = {
  enabled: false,
  flat_fee: 0,
  free_above: 0,
  cod_fee: 0,
  zones: [],
  note: "",
};

const money = (v: unknown, max = 100000): number => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(Math.min(n, max) * 100) / 100;
};

// Turns whatever is stored (or typed) into a safe, complete config.
export function normalizeShipping(raw: unknown): ShippingConfig {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const zonesIn = Array.isArray(r["zones"]) ? (r["zones"] as unknown[]) : [];
  const zones: ShippingZone[] = [];
  for (const z of zonesIn.slice(0, 20)) {
    const o = (z && typeof z === "object" ? z : {}) as Record<string, unknown>;
    const prefixesRaw = Array.isArray(o["prefixes"])
      ? (o["prefixes"] as unknown[])
      : String(o["prefixes"] ?? "").split(/[\s,]+/);
    const prefixes = prefixesRaw
      .map((p) => String(p).trim())
      .filter((p) => /^\d{1,6}$/.test(p))
      .slice(0, 100);
    if (prefixes.length === 0) continue;
    zones.push({
      label: String(o["label"] ?? "")
        .trim()
        .slice(0, 40),
      prefixes,
      fee: money(o["fee"], 10000),
    });
  }
  return {
    enabled: r["enabled"] === true,
    flat_fee: money(r["flat_fee"], 10000),
    free_above: money(r["free_above"], 1000000),
    cod_fee: money(r["cod_fee"], 10000),
    zones,
    note: String(r["note"] ?? "")
      .trim()
      .slice(0, 160),
  };
}

export type ShippingQuote = {
  shipping: number;
  cod_fee: number;
  total: number;
  free: boolean; // delivery is free for this order
  zone: string | null; // label of the matched zone, if any
  pincode_known: boolean; // a valid 6-digit pincode was supplied
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function calcShipping(
  cfg: ShippingConfig,
  subtotal: number,
  pincode: string,
  paymentMethod: string,
): ShippingQuote {
  const pin = (pincode || "").trim();
  const pincode_known = /^\d{6}$/.test(pin);
  if (!cfg.enabled) {
    return {
      shipping: 0,
      cod_fee: 0,
      total: r2(subtotal),
      free: true,
      zone: null,
      pincode_known,
    };
  }
  const zone = pincode_known
    ? cfg.zones.find((z) => z.prefixes.some((p) => pin.startsWith(p)))
    : undefined;
  let shipping = zone ? zone.fee : cfg.flat_fee;
  if (cfg.free_above > 0 && subtotal >= cfg.free_above) shipping = 0;
  const cod_fee = paymentMethod === "cod" ? cfg.cod_fee : 0;
  return {
    shipping: r2(shipping),
    cod_fee: r2(cod_fee),
    total: r2(subtotal + shipping + cod_fee),
    free: shipping === 0,
    zone: zone ? zone.label || null : null,
    pincode_known,
  };
}
