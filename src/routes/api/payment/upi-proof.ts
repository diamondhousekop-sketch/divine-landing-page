import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase.server";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit.server";
import { json, badRequest, serverError } from "@/lib/http.server";
import { sendOrderConfirmation, sendAdminAlert } from "@/lib/email.server";
import { PROOF_BUCKET, PROOF_MAX_BYTES, sniffImage, verifyProofToken } from "@/lib/upi.server";
import { UTR_REGEX } from "@/lib/upi";

const Input = z.object({
  order_id: z.string().uuid(),
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  utr: z.string().trim().regex(UTR_REGEX, "UTR must be 12 digits").optional().or(z.literal("")),
  // data URL, e.g. "data:image/jpeg;base64,...."
  data_url: z.string().min(32).max(8_000_000),
});

// Customer uploads the UPI payment screenshot for THEIR order.
// This never marks an order "paid" — it only moves it to "verifying" so the
// owner can check the money in their own bank/UPI app and approve it.
export const Route = createFileRoute("/api/payment/upi-proof")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = clientIp(request);
        const rl = rateLimit(`upi-proof:${ip}`, { limit: 6, windowMs: 60_000 });
        if (!rl.ok) return tooManyRequests(rl.retryAfter);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid request");
        }
        const parsed = Input.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        const p = parsed.data;

        if (!verifyProofToken(p.order_id, p.token)) {
          return json({ error: "Invalid upload link. Please contact us." }, 403);
        }

        // ── decode + validate image bytes ──
        const match = /^data:[^;,]+;base64,([A-Za-z0-9+/=\s]+)$/.exec(p.data_url);
        if (!match?.[1]) return badRequest("Please upload a valid image");
        const bytes = new Uint8Array(Buffer.from(match[1], "base64"));
        if (bytes.byteLength < 100) return badRequest("Please upload a valid image");
        if (bytes.byteLength > PROOF_MAX_BYTES) return badRequest("Image too large — max 5MB");
        const img = sniffImage(bytes);
        if (!img) return badRequest("Only JPG, PNG or WEBP screenshots are allowed");

        try {
          const admin = getAdminClient();
          const { data: order, error: getErr } = await admin
            .from("orders")
            .select("*")
            .eq("id", p.order_id)
            .maybeSingle();
          if (getErr) return serverError("Could not load order");
          if (!order || order.payment_method !== "upi") return badRequest("Order not found");
          if (order.payment_status === "paid") {
            return json({ ok: true, already_paid: true, order_number: order.order_number });
          }
          if (order.order_status === "cancelled") {
            return badRequest("This order was cancelled. Please contact us.");
          }

          const utr = p.utr || null;
          if (utr) {
            const { data: dupe } = await admin
              .from("orders")
              .select("id")
              .eq("upi_utr", utr)
              .neq("id", order.id)
              .limit(1)
              .maybeSingle();
            if (dupe) {
              return json({ error: "This UTR is already used for another order." }, 409);
            }
          }

          const path = `${order.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${img.ext}`;
          const { error: upErr } = await admin.storage.from(PROOF_BUCKET).upload(path, bytes, {
            contentType: img.type,
            upsert: false,
          });
          if (upErr) {
            console.error("[upi-proof] storage error:", upErr);
            return serverError("Could not save the screenshot. Please try again.");
          }

          const firstSubmission = order.payment_status === "pending";
          const previousPath: string | null = order.payment_proof_path;

          const { data: updated, error: updErr } = await admin
            .from("orders")
            .update({
              payment_status: "verifying",
              upi_utr: utr,
              payment_proof_path: path,
              payment_submitted_at: new Date().toISOString(),
              payment_note: null,
            })
            .eq("id", order.id)
            .neq("payment_status", "paid") // never downgrade a paid order (race-safe)
            .select("*")
            .maybeSingle();

          if (updErr || !updated) {
            void admin.storage.from(PROOF_BUCKET).remove([path]);
            if (updErr?.code === "23505") {
              return json({ error: "This UTR is already used for another order." }, 409);
            }
            if (!updErr) {
              return json({ ok: true, already_paid: true, order_number: order.order_number });
            }
            console.error("[upi-proof] update failed:", updErr);
            return serverError("Could not update the order. Please try again.");
          }

          // Replaced an older screenshot (e.g. after a rejection) → delete the old file.
          if (previousPath && previousPath !== path) {
            void admin.storage.from(PROOF_BUCKET).remove([previousPath]);
          }

          if (firstSubmission) {
            void sendOrderConfirmation(updated, updated.customer_email ?? undefined);
          }
          void sendAdminAlert(updated);

          return json({
            ok: true,
            order_number: updated.order_number,
            total_amount: Number(updated.total_amount),
          });
        } catch (err) {
          console.error("[upi-proof] unexpected:", err);
          return serverError();
        }
      },
    },
  },
});
