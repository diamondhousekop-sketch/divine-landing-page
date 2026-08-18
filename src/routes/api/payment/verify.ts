import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase.server";
import { getRazorpayConfig, verifyPaymentSignature } from "@/lib/razorpay.server";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit.server";
import { json, badRequest, serverError } from "@/lib/http.server";
import { sendPaymentConfirmation } from "@/lib/email.server";
import { generateInvoice } from "@/lib/invoice.server";

const Input = z.object({
  order_id: z.string().uuid(),
  razorpay_order_id: z.string().min(4),
  razorpay_payment_id: z.string().min(4),
  razorpay_signature: z.string().min(8),
});

// Verifies the Razorpay signature SERVER-SIDE. A client-reported "success" is
// never trusted — only a valid HMAC signature flips payment_status to paid.
export const Route = createFileRoute("/api/payment/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = clientIp(request);
        const rl = rateLimit(`pay-verify:${ip}`, { limit: 15, windowMs: 60_000 });
        if (!rl.ok) return tooManyRequests(rl.retryAfter);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }
        const parsed = Input.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        const p = parsed.data;

        try {
          const cfg = await getRazorpayConfig();
          if (!cfg) return badRequest("Online payment is not configured");

          const valid = verifyPaymentSignature({
            razorpay_order_id: p.razorpay_order_id,
            razorpay_payment_id: p.razorpay_payment_id,
            razorpay_signature: p.razorpay_signature,
            key_secret: cfg.key_secret,
          });

          const admin = getAdminClient();

          if (!valid) {
            await admin.from("orders").update({ payment_status: "failed" }).eq("id", p.order_id);
            return badRequest("Payment signature verification failed");
          }

          const { data: order, error } = await admin
            .from("orders")
            .update({
              payment_status: "paid",
              order_status: "confirmed",
              razorpay_payment_id: p.razorpay_payment_id,
              razorpay_order_id: p.razorpay_order_id,
            })
            .eq("id", p.order_id)
            .select("*")
            .single();

          if (error || !order) return serverError("Could not update order");

          // Generate the branded PDF invoice and email it (best-effort — must
          // never block the success response).
          try {
            const { number, pdf } = await generateInvoice(admin, order);
            void sendPaymentConfirmation(order, order.customer_email ?? undefined, {
              pdf,
              number,
            });
          } catch (e) {
            console.error("[payment/verify] invoice/email failed:", e);
            void sendPaymentConfirmation(order, order.customer_email ?? undefined);
          }

          return json({ ok: true, order_number: order.order_number });
        } catch (err) {
          console.error("[payment/verify] error:", err);
          return serverError();
        }
      },
    },
  },
});
