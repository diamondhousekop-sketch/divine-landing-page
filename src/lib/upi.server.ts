import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { UPI_ID_REGEX } from "./upi";
import { getEnv } from "@/lib/env.server";

// SERVER-ONLY helpers for direct-UPI payments.
if (typeof window !== "undefined") {
  throw new Error("upi.server.ts must not be imported in the browser bundle");
}

export const PROOF_BUCKET = "payment-proofs";
export const PROOF_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export type UpiSettings = { enabled: boolean; upi_id: string; payee_name: string };

export async function getUpiSettings(admin: SupabaseClient): Promise<UpiSettings> {
  const { data } = await admin
    .from("admin_settings")
    .select("value")
    .eq("key", "upi")
    .maybeSingle();
  const v = (data?.value ?? {}) as Partial<UpiSettings>;
  return {
    enabled: v.enabled === true,
    upi_id: typeof v.upi_id === "string" ? v.upi_id.trim() : "",
    payee_name: typeof v.payee_name === "string" ? v.payee_name.trim() : "",
  };
}

// UPI is usable only when the owner switched it on AND saved a valid UPI ID.
export function upiReady(s: UpiSettings): boolean {
  return s.enabled && UPI_ID_REGEX.test(s.upi_id);
}

// ── Proof-upload token ──────────────────────────────────────────────────────
// The checkout gets a token for ITS OWN order only. Without it nobody can
// attach a screenshot to someone else's order by guessing an order id.
function secret(): string {
  const s = getEnv("UPI_PROOF_SECRET") || getEnv("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!s) throw new Error("Missing server secret for UPI proof tokens");
  return s;
}

export function signProofToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`upi-proof:${orderId}`).digest("hex");
}

export function verifyProofToken(orderId: string, token: string): boolean {
  const expected = Buffer.from(signProofToken(orderId), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// ── Image sniffing ──────────────────────────────────────────────────────────
// Trust the file BYTES, not the browser-declared type: a renamed .exe/.html
// must never be stored as an "image".
export function sniffImage(bytes: Uint8Array): { type: string; ext: string } | null {
  const b = bytes;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { type: "image/jpeg", ext: "jpg" };
  }
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return { type: "image/png", ext: "png" };
  }
  if (
    b.length >= 12 &&
    b[0] === 0x52 && // R
    b[1] === 0x49 && // I
    b[2] === 0x46 && // F
    b[3] === 0x46 && // F
    b[8] === 0x57 && // W
    b[9] === 0x45 && // E
    b[10] === 0x42 && // B
    b[11] === 0x50 // P
  ) {
    return { type: "image/webp", ext: "webp" };
  }
  return null;
}
