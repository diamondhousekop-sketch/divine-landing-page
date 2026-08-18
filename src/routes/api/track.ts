import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase.server";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit.server";
import { json, badRequest } from "@/lib/http.server";

// Public order tracking. Requires BOTH order number AND matching phone to avoid
// order-number enumeration / privacy leaks. Returns only status-safe fields.
const Input = z.object({
  order_number: z.string().trim().min(4).max(40),
  phone: z.string().trim().min(10).max(15),
});

function normPhone(p: string) {
  return p.replace(/\D/g, "").slice(-10);
}

export const Route = createFileRoute("/api/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = clientIp(request);
        const rl = rateLimit(`track:${ip}`, { limit: 20, windowMs: 60_000 });
        if (!rl.ok) return tooManyRequests(rl.retryAfter);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }
        const parsed = Input.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

        const admin = getAdminClient();
        const { data } = await admin
          .from("orders")
          .select("order_number,customer_name,customer_phone,customer_pincode,order_status,payment_status,payment_method,quantity,total_amount,created_at,updated_at")
          .eq("order_number", parsed.data.order_number.trim())
          .maybeSingle();

        if (!data || normPhone(data.customer_phone) !== normPhone(parsed.data.phone)) {
          return json({ found: false }, 404);
        }

        return json({
          found: true,
          order: {
            order_number: data.order_number,
            customer_name: data.customer_name,
            pincode: data.customer_pincode,
            order_status: data.order_status,
            payment_status: data.payment_status,
            payment_method: data.payment_method,
            quantity: data.quantity,
            total_amount: Number(data.total_amount),
            created_at: data.created_at,
            updated_at: data.updated_at,
          },
        });
      },
    },
  },
});
