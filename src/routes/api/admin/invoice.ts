import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";
import { generateInvoice } from "@/lib/invoice.server";
import { sendInvoiceEmail } from "@/lib/email.server";

// Admin-only invoice endpoints:
//   GET  /api/admin/invoice?order_id=…  -> streams the branded PDF (download)
//   POST /api/admin/invoice { order_id } -> (re)sends the invoice PDF to the customer
async function loadOrder(orderId: string) {
  const admin = getAdminClient();
  const { data, error } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error || !data) return null;
  return data;
}

export const Route = createFileRoute("/api/admin/invoice")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        const url = new URL(request.url);
        const orderId = url.searchParams.get("order_id") || "";
        if (!z.string().uuid().safeParse(orderId).success) return badRequest("Invalid order_id");
        try {
          const order = await loadOrder(orderId);
          if (!order) return badRequest("Order not found");
          const admin = getAdminClient();
          const { number, pdf } = await generateInvoice(admin, order);
          return new Response(Buffer.from(pdf), {
            status: 200,
            headers: {
              "content-type": "application/pdf",
              "content-disposition": `attachment; filename="Invoice-${number}.pdf"`,
              "cache-control": "no-store",
            },
          });
        } catch (err) {
          console.error("[admin/invoice GET]", err);
          return serverError("Could not generate invoice");
        }
      },

      POST: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON");
        }
        const parsed = z.object({ order_id: z.string().uuid() }).safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        try {
          const order = await loadOrder(parsed.data.order_id);
          if (!order) return badRequest("Order not found");
          if (!order.customer_email) return badRequest("या ऑर्डरला ग्राहकाचा ईमेल नाही");
          const admin = getAdminClient();
          const { number, pdf } = await generateInvoice(admin, order);
          await sendInvoiceEmail(order, order.customer_email, { pdf, number });
          return json({ ok: true, invoice_number: number, emailed_to: order.customer_email });
        } catch (err) {
          console.error("[admin/invoice POST]", err);
          return serverError("Could not send invoice");
        }
      },
    },
  },
});
