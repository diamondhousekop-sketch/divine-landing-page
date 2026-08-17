import { createFileRoute } from "@tanstack/react-router";
import { getAdminClient } from "@/lib/supabase.server";
import { getRazorpayConfig, verifyWebhookSignature } from "@/lib/razorpay.server";
import { json } from "@/lib/http.server";

// Razorpay webhook handler. Verifies the webhook signature against the RAW body
// and marks orders paid on payment.captured. Configure this URL + secret in the
// Razorpay Dashboard → Webhooks.
export const Route = createFileRoute("/api/webhook/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-razorpay-signature") || "";

        const cfg = await getRazorpayConfig();
        if (!cfg || !cfg.webhook_secret) {
          console.warn("[webhook] razorpay webhook secret not configured");
          return json({ ok: false }, 200);
        }

        if (!verifyWebhookSignature(rawBody, signature, cfg.webhook_secret)) {
          return json({ error: "invalid signature" }, 400);
        }

        try {
          const event = JSON.parse(rawBody) as {
            event?: string;
            payload?: { payment?: { entity?: { order_id?: string; id?: string } } };
          };
          const entity = event.payload?.payment?.entity;
          if (
            (event.event === "payment.captured" || event.event === "order.paid") &&
            entity?.order_id
          ) {
            const admin = getAdminClient();
            await admin
              .from("orders")
              .update({
                payment_status: "paid",
                order_status: "confirmed",
                razorpay_payment_id: entity.id ?? null,
              })
              .eq("razorpay_order_id", entity.order_id)
              .neq("payment_status", "paid");
          }
        } catch (err) {
          console.error("[webhook] processing error:", err);
        }

        // Always 200 so Razorpay doesn't retry endlessly once signature is valid.
        return json({ ok: true }, 200);
      },
    },
  },
});
