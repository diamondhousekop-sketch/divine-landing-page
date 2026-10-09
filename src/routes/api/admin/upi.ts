import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";
import { sendPaymentConfirmation } from "@/lib/email.server";
import { generateInvoice } from "@/lib/invoice.server";
import { PROOF_BUCKET } from "@/lib/upi.server";

const ActionInput = z.object({
  order_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(300).optional(),
});

export const Route = createFileRoute("/api/admin/upi")({
  server: {
    handlers: {
      // Short-lived signed link to view a payment screenshot (private bucket).
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        const id = new URL(request.url).searchParams.get("order_id") || "";
        if (!z.string().uuid().safeParse(id).success) return badRequest("Valid order id required");
        try {
          const admin = getAdminClient();
          const { data: order } = await admin
            .from("orders")
            .select("payment_proof_path")
            .eq("id", id)
            .maybeSingle();
          if (!order?.payment_proof_path) return json({ url: null });
          const { data, error } = await admin.storage
            .from(PROOF_BUCKET)
            .createSignedUrl(order.payment_proof_path, 300);
          if (error || !data) return serverError("Could not load screenshot");
          return json({ url: data.signedUrl });
        } catch (err) {
          console.error("[admin/upi GET]", err);
          return serverError();
        }
      },

      // Owner verified (or could not find) the money in their bank / UPI app.
      POST: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }
        const parsed = ActionInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        const { order_id, action, note } = parsed.data;

        try {
          const admin = getAdminClient();
          const { data: current } = await admin
            .from("orders")
            .select("*")
            .eq("id", order_id)
            .maybeSingle();
          if (!current) return badRequest("Order not found");
          if (current.payment_method !== "upi") return badRequest("Not a UPI order");

          if (action === "approve") {
            if (current.payment_status === "paid") return json({ order: current });
            const { data: order, error } = await admin
              .from("orders")
              .update({
                payment_status: "paid",
                // Move a fresh order forward; never pull back a shipped/delivered one.
                order_status:
                  current.order_status === "placed" ? "confirmed" : current.order_status,
                payment_verified_at: new Date().toISOString(),
                payment_note: null,
              })
              .eq("id", order_id)
              .select("*")
              .single();
            if (error || !order) return serverError("Could not update order");

            // Invoice + "payment received" email — best effort, never blocks.
            try {
              const { number, pdf } = await generateInvoice(admin, order);
              void sendPaymentConfirmation(order, order.customer_email ?? undefined, {
                pdf,
                number,
              });
            } catch (e) {
              console.error("[admin/upi] invoice/email failed:", e);
              void sendPaymentConfirmation(order, order.customer_email ?? undefined);
            }
            return json({ order });
          }

          // reject
          if (current.payment_status === "paid") {
            return badRequest(
              "Already marked paid. Change it from the payment dropdown if needed.",
            );
          }
          const { data: order, error } = await admin
            .from("orders")
            .update({
              payment_status: "failed",
              payment_note: note || "Payment not received",
            })
            .eq("id", order_id)
            .select("*")
            .single();
          if (error || !order) return serverError("Could not update order");
          return json({ order });
        } catch (err) {
          console.error("[admin/upi POST]", err);
          return serverError();
        }
      },
    },
  },
});
