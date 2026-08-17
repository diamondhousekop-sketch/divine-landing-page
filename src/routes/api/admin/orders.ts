import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";
import { sendShippingUpdate, sendDeliveryConfirmation } from "@/lib/email.server";

const PatchInput = z.object({
  id: z.string().uuid(),
  order_status: z.enum(["placed", "confirmed", "shipped", "delivered", "cancelled"]).optional(),
  payment_status: z.enum(["pending", "paid", "failed"]).optional(),
});

export const Route = createFileRoute("/api/admin/orders")({
  server: {
    handlers: {
      // List orders with optional ?status=&payment=&q= filters.
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        try {
          const url = new URL(request.url);
          const status = url.searchParams.get("status");
          const payment = url.searchParams.get("payment");
          const q = url.searchParams.get("q");

          const admin = getAdminClient();
          let query = admin.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
          if (status) query = query.eq("order_status", status);
          if (payment) query = query.eq("payment_status", payment);
          if (q) {
            query = query.or(
              `order_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`,
            );
          }
          const { data, error } = await query;
          if (error) return serverError("Could not load orders");
          return json({ orders: data ?? [] });
        } catch (err) {
          console.error("[admin/orders GET]", err);
          return serverError();
        }
      },

      // Update order/payment status. Sends shipping/delivery emails on transition.
      PATCH: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }
        const parsed = PatchInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        const { id, ...updates } = parsed.data;
        if (Object.keys(updates).length === 0) return badRequest("No fields to update");

        try {
          const admin = getAdminClient();
          const { data: order, error } = await admin
            .from("orders")
            .update(updates)
            .eq("id", id)
            .select("*")
            .single();
          if (error || !order) return serverError("Could not update order");

          if (updates.order_status === "shipped") {
            void sendShippingUpdate(order, order.customer_email ?? undefined);
          } else if (updates.order_status === "delivered") {
            void sendDeliveryConfirmation(order, order.customer_email ?? undefined);
          }
          return json({ order });
        } catch (err) {
          console.error("[admin/orders PATCH]", err);
          return serverError();
        }
      },
    },
  },
});
