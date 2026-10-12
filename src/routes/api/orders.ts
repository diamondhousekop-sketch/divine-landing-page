import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase.server";
import { rateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit.server";
import { json, badRequest, serverError, generateOrderNumber } from "@/lib/http.server";
import { sendOrderConfirmation, sendAdminAlert } from "@/lib/email.server";
import { getUpiSettings, upiReady, signProofToken } from "@/lib/upi.server";
import { calcShipping, normalizeShipping } from "@/lib/shipping";

const OrderInput = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(200).optional().or(z.literal("")),
  customer_phone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  customer_address: z.string().trim().min(6).max(600),
  customer_pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
  quantity: z.number().int().min(1).max(10).default(1),
  payment_method: z.enum(["online", "cod", "upi"]),
  product_id: z.string().uuid().optional(),
  color_letter: z.string().trim().max(10).optional().or(z.literal("")),
  color_group: z.enum(["red", "white", "green", "yellow", "grey"]).optional(),
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
          let productQuery = admin
            .from("products")
            .select("id,price,is_active,stock_quantity")
            .eq("is_active", true);
          productQuery = input.product_id
            ? productQuery.eq("id", input.product_id)
            : productQuery.order("created_at", { ascending: true });
          const { data: product, error: prodErr } = await productQuery.limit(1).maybeSingle();

          if (prodErr) return serverError("Could not load product");
          if (!product) return badRequest("Product is not available");
          if (Number(product.stock_quantity) <= 0) {
            return badRequest("Product is out of stock");
          }

          // COD is ON by default; the owner can disable it from Admin → Settings.
          if (input.payment_method === "cod") {
            const { data: cs } = await admin
              .from("admin_settings")
              .select("value")
              .eq("key", "checkout")
              .maybeSingle();
            const codEnabled =
              (cs?.value as { cod_enabled?: boolean } | undefined)?.cod_enabled !== false;
            if (!codEnabled) {
              return badRequest("Cash on Delivery is currently unavailable. Please pay online.");
            }
          }

          // Direct UPI: only when the owner enabled it and saved a valid UPI ID.
          let upi: Awaited<ReturnType<typeof getUpiSettings>> | null = null;
          if (input.payment_method === "upi") {
            const s = await getUpiSettings(admin);
            if (!upiReady(s)) {
              return badRequest(
                "UPI payment is currently unavailable. Please choose another option.",
              );
            }
            upi = s;
          }

          // Delivery charge + COD fee are calculated HERE from the owner's saved rules,
          // never from anything the browser sends.
          const { data: shipRow } = await admin
            .from("admin_settings")
            .select("value")
            .eq("key", "shipping")
            .maybeSingle();
          const itemsTotal = Number(product.price) * input.quantity;
          const quote = calcShipping(
            normalizeShipping(shipRow?.value),
            itemsTotal,
            input.customer_pincode,
            input.payment_method,
          );
          const total = quote.total;

          // Colour-letter feature can be switched off by the owner.
          const { data: cpRow } = await admin
            .from("site_content")
            .select("value")
            .eq("key", "feature_color_picker")
            .maybeSingle();
          const colorOn = cpRow?.value !== "off";
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
            shipping_amount: quote.shipping,
            cod_fee: quote.cod_fee,
            payment_method: input.payment_method,
            payment_status: "pending" as const,
            order_status: "placed" as const,
            color_letter: colorOn ? input.color_letter || null : null,
            color_group: colorOn ? input.color_group || null : null,
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
          // UPI orders alert the owner only once the customer uploads the payment
          // proof (/api/payment/upi-proof), so abandoned checkouts don't spam.
          if (input.payment_method === "cod") {
            void sendOrderConfirmation(order, order.customer_email ?? undefined);
            void sendAdminAlert(order);
          } else if (input.payment_method === "online") {
            void sendAdminAlert(order);
          }

          return json({
            order: {
              id: order.id,
              order_number: order.order_number,
              total_amount: Number(order.total_amount),
              shipping_amount: Number(order.shipping_amount ?? 0),
              cod_fee: Number(order.cod_fee ?? 0),
              payment_method: order.payment_method,
            },
            ...(upi
              ? {
                  upi: {
                    upi_id: upi.upi_id,
                    payee_name: upi.payee_name || "Diamond House",
                    proof_token: signProofToken(order.id),
                  },
                }
              : {}),
          });
        } catch (err) {
          console.error("[orders] unexpected:", err);
          return serverError();
        }
      },
    },
  },
});
