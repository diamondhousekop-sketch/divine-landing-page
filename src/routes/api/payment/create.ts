import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase.server";
import { getRazorpayClient } from "@/lib/razorpay.server";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit.server";
import { json, badRequest, serverError } from "@/lib/http.server";

const Input = z.object({ order_id: z.string().uuid() });

// Creates a Razorpay order server-side (amount is taken from the DB order, not
// the client) and links it back to our order row.
export const Route = createFileRoute("/api/payment/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = clientIp(request);
        const rl = rateLimit(`pay-create:${ip}`, { limit: 10, windowMs: 60_000 });
        if (!rl.ok) return tooManyRequests(rl.retryAfter);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }
        const parsed = Input.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

        try {
          const rp = await getRazorpayClient();
          if (!rp)
            return badRequest("Online payment is not configured. Please use Cash on Delivery.");

          const admin = getAdminClient();
          const { data: order, error } = await admin
            .from("orders")
            .select("id,order_number,total_amount,payment_status")
            .eq("id", parsed.data.order_id)
            .maybeSingle();
          if (error || !order) return badRequest("Order not found");
          if (order.payment_status === "paid") return badRequest("Order is already paid");

          const amountPaise = Math.round(Number(order.total_amount) * 100);
          const rzpOrder = await rp.client.orders.create({
            amount: amountPaise,
            currency: "INR",
            receipt: order.order_number,
            notes: { order_id: order.id, order_number: order.order_number },
          });

          await admin.from("orders").update({ razorpay_order_id: rzpOrder.id }).eq("id", order.id);

          return json({
            razorpay_order_id: rzpOrder.id,
            amount: amountPaise,
            currency: "INR",
            key_id: rp.config.key_id,
            order_number: order.order_number,
          });
        } catch (err) {
          console.error("[payment/create] error:", err);
          return serverError("Could not initiate payment");
        }
      },
    },
  },
});
