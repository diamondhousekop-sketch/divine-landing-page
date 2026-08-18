import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";

// Admin-managed PUBLIC store settings kept in admin_settings:
//   - marketing  : Meta Pixel / GA4 / GTM / Search Console IDs (public identifiers,
//                  surfaced to the browser via /api/config)
//   - checkout   : { cod_enabled } — COD is ON by default; the owner can turn it
//                  off later from here (does NOT affect online payment)
//   - invoicing  : business name/address/GST + invoice number prefix + product label
// These are NOT secrets, unlike the razorpay key stored under "razorpay".

const Marketing = z.object({
  meta_pixel_id: z.string().trim().max(60).optional(),
  ga4_id: z.string().trim().max(60).optional(),
  gtm_id: z.string().trim().max(60).optional(),
  gsc_verification: z.string().trim().max(200).optional(),
});
const Checkout = z.object({ cod_enabled: z.boolean().optional() });
const Invoicing = z.object({
  prefix: z.string().trim().max(12).optional(),
  business_name: z.string().trim().max(120).optional(),
  business_address: z.string().trim().max(300).optional(),
  business_phone: z.string().trim().max(40).optional(),
  business_email: z.string().trim().max(120).optional(),
  gstin: z.string().trim().max(30).optional(),
  product_label: z.string().trim().max(120).optional(),
});

const PutInput = z.object({
  marketing: Marketing.optional(),
  checkout: Checkout.optional(),
  invoicing: Invoicing.optional(),
});

async function readKey(admin: ReturnType<typeof getAdminClient>, key: string) {
  const { data } = await admin.from("admin_settings").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? {}) as Record<string, unknown>;
}

export const Route = createFileRoute("/api/admin/store-settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        try {
          const admin = getAdminClient();
          const [marketing, checkout, invoicing] = await Promise.all([
            readKey(admin, "marketing"),
            readKey(admin, "checkout"),
            readKey(admin, "invoicing"),
          ]);
          return json({
            marketing,
            checkout: { cod_enabled: checkout["cod_enabled"] !== false, ...checkout },
            invoicing,
          });
        } catch (err) {
          console.error("[store-settings GET]", err);
          return serverError();
        }
      },

      PUT: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON");
        }
        const parsed = PutInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        try {
          const admin = getAdminClient();
          const rows: { key: string; value: unknown }[] = [];
          for (const key of ["marketing", "checkout", "invoicing"] as const) {
            const incoming = parsed.data[key];
            if (incoming === undefined) continue;
            const current = await readKey(admin, key);
            rows.push({ key, value: { ...current, ...incoming } });
          }
          if (rows.length === 0) return badRequest("Nothing to update");
          const { error } = await admin.from("admin_settings").upsert(rows, { onConflict: "key" });
          if (error) return serverError("Could not save settings");
          return json({ ok: true });
        } catch (err) {
          console.error("[store-settings PUT]", err);
          return serverError();
        }
      },
    },
  },
});
