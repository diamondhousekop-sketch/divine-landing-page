import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase.server";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit.server";
import { json, badRequest, serverError, generateOrderNumber } from "@/lib/http.server";
import { sendOrderConfirmation, sendAdminAlert } from "@/lib/email.server";

const OrderInput = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(200).optional().or(z.literal("")),
  customer_phone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  customer_address: z.string().trim().min(6).max(600),
  customer_pincode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  quantity: z.number().int().min(1).max(10).default(1),
  payment_method: z.enum(["online", "cod"]),
  product_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/api/orders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = clientIp(request);
        const rl = rateLimit(`orders:${ip}`, { limit: 8, windowMs: 60_000 });
        if (!rl.ok) return tooManyRequests(rl.retryAfter);

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }

        const parsed = OrderInput.safeParse(body);
        if (!parsed.success) {
          return badRequest("Validation failed", parsed.error.flatten());
        }
        const input = parsed.data;

        try {
          const admin = getAdminClient();

          // Re-fetch product & price server-side — NEVER trust a client-sent price.
          let productQuery = admin.from("products").select("id,price,is_active,stock_quantity").eq("is_active", true);
          productQuery = input.product_id
            ? productQuery.eq("id", input.product_id)
            : productQuery.order("created_at", { ascending: true });
          const { data: product, error: prodErr } = await productQuery.limit(1).maybeSingle();

          if (prodErr) return serverError("Could not load product");
          if (!product) return badRequest("Product is not available");

          const total = Number(product.price) * input.quantity;
          const orderNumber = generateOrderNumber();

          const insertRow = {
            order_number: orderNumber,
            customer_name: input.customer_name,
            customer_email: input.customer_email || null,
            customer_phone: input.customer_phone,
            customer_address: input.customer_address,
            customer_pincode: input.customer_pincode,
            product_id: product.id,
            quantity: input.quantity,
            total_amount: total,
            payment_method: input.payment_method,
            payment_status: "pending" as const,
            order_status: "placed" as const,
          };

          const { data: order, error: insErr } = await admin
            .from("orders")
            .insert(insertRow)
            .select("*")
            .single();

          if (insErr || !order) {
            console.error("[orders] insert failed:", insErr);
            return serverError("Could not create order");
          }

          // COD orders are confirmed immediately — fire order confirmation + admin alert.
          // Online orders trigger emails after payment verification instead.
          if (input.payment_method === "cod") {
            void sendOrderConfirmation(order, order.customer_email ?? undefined);
            void sendAdminAlert(order);
          } else {
            void sendAdminAlert(order);
          }

          return json({
            order: {
              id: order.id,
              order_number: order.order_number,
              total_amount: Number(order.total_amount),
              payment_method: order.payment_method,
            },
          });
        } catch (err) {
          console.error("[orders] unexpected:", err);
          return serverError();
        }
      },
    },
  },
});
