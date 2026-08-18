import Razorpay from "razorpay";
import crypto from "node:crypto";
import { getAdminClient } from "./supabase.server";

// Razorpay credentials are admin-configurable: they live in the `admin_settings`
// table (service-role only, never exposed to the client) under key "razorpay".
// If not set there, we fall back to environment variables. Placeholder values are
// treated as "not configured".
export type RazorpayConfig = {
  key_id: string;
  key_secret: string;
  webhook_secret: string;
  enabled: boolean;
};

function isPlaceholder(v: string | undefined | null): boolean {
  if (!v) return true;
  return /placeholder|your_|xxx|changeme/i.test(v);
}

export async function getRazorpayConfig(): Promise<RazorpayConfig | null> {
  let cfg: Partial<RazorpayConfig> = {};
  try {
    const admin = getAdminClient();
    const { data } = await admin
      .from("admin_settings")
      .select("value")
      .eq("key", "razorpay")
      .maybeSingle();
    if (data?.value) cfg = data.value as Partial<RazorpayConfig>;
  } catch {
    // fall through to env
  }

  const key_id = cfg.key_id || process.env["RAZORPAY_KEY_ID"] || "";
  const key_secret = cfg.key_secret || process.env["RAZORPAY_KEY_SECRET"] || "";
  const webhook_secret = cfg.webhook_secret || process.env["RAZORPAY_WEBHOOK_SECRET"] || "";

  if (isPlaceholder(key_id) || isPlaceholder(key_secret)) return null;
  return { key_id, key_secret, webhook_secret, enabled: true };
}

export async function getRazorpayClient(): Promise<{
  client: Razorpay;
  config: RazorpayConfig;
} | null> {
  const config = await getRazorpayConfig();
  if (!config) return null;
  return {
    client: new Razorpay({ key_id: config.key_id, key_secret: config.key_secret }),
    config,
  };
}

export function verifyPaymentSignature(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  key_secret: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", params.key_secret)
    .update(`${params.razorpay_order_id}|${params.razorpay_payment_id}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(params.razorpay_signature));
  } catch {
    return false;
  }
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
  } catch {
    return false;
  }
}
