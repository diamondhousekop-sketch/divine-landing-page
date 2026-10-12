import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";
import { UPI_ID_REGEX } from "@/lib/upi";
import { getRazorpayConfig } from "@/lib/razorpay.server";
import { normalizeShipping } from "@/lib/shipping";

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

const Upi = z
  .object({
    enabled: z.boolean().optional(),
    upi_id: z
      .string()
      .trim()
      .max(260)
      .refine((v) => v === "" || UPI_ID_REGEX.test(v), "Enter a valid UPI ID, e.g. name@okaxis")
      .optional(),
    payee_name: z.string().trim().max(60).optional(),
  })
  .refine((v) => !v.enabled || (v.upi_id !== undefined && UPI_ID_REGEX.test(v.upi_id)), {
    message: "Add a valid UPI ID before turning UPI payments on",
    path: ["upi_id"],
  });

const Shipping = z.object({
  enabled: z.boolean(),
  flat_fee: z.number().min(0).max(10000),
  free_above: z.number().min(0).max(1000000),
  cod_fee: z.number().min(0).max(10000),
  note: z.string().trim().max(160).optional(),
  zones: z
    .array(
      z.object({
        label: z.string().trim().max(40),
        prefixes: z
          .array(z.string().regex(/^\d{1,6}$/, "Pincode prefix must be 1–6 digits"))
          .max(100),
        fee: z.number().min(0).max(10000),
      }),
    )
    .max(20),
});

const PutInput = z.object({
  color_picker_enabled: z.boolean().optional(),
  shipping: Shipping.optional(),
  marketing: Marketing.optional(),
  checkout: Checkout.optional(),
  invoicing: Invoicing.optional(),
  upi: Upi.optional(),
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
          const [marketing, checkout, invoicing, upi, shipping, colorRow] = await Promise.all([
            readKey(admin, "marketing"),
            readKey(admin, "checkout"),
            readKey(admin, "invoicing"),
            readKey(admin, "upi"),
            readKey(admin, "shipping"),
            admin
              .from("site_content")
              .select("value")
              .eq("key", "feature_color_picker")
              .maybeSingle(),
          ]);
          return json({
            color_picker_enabled: colorRow.data?.value !== "off",
            shipping: normalizeShipping(shipping),
            marketing,
            checkout: { cod_enabled: checkout["cod_enabled"] !== false, ...checkout },
            invoicing,
            upi: {
              enabled: upi["enabled"] === true,
              upi_id: typeof upi["upi_id"] === "string" ? upi["upi_id"] : "",
              payee_name: typeof upi["payee_name"] === "string" ? upi["payee_name"] : "",
            },
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
        if (!parsed.success) {
          return badRequest(
            parsed.error.issues[0]?.message || "Validation failed",
            parsed.error.flatten(),
          );
        }
        try {
          const admin = getAdminClient();
          const rows: { key: string; value: unknown }[] = [];
          if (parsed.data.shipping) {
            rows.push({ key: "shipping", value: normalizeShipping(parsed.data.shipping) });
          }
          for (const key of ["marketing", "checkout", "invoicing", "upi"] as const) {
            const incoming = parsed.data[key];
            if (incoming === undefined) continue;
            const current = await readKey(admin, key);
            rows.push({ key, value: { ...current, ...incoming } });
          }
          if (rows.length === 0 && parsed.data.color_picker_enabled === undefined) {
            return badRequest("Nothing to update");
          }
          // Safety net: never let the shop end up with NO way to pay.
          const finalOf = (k: string) =>
            (rows.find((r) => r.key === k)?.value as Record<string, unknown> | undefined) ?? null;
          const checkoutFinal = finalOf("checkout") ?? (await readKey(admin, "checkout"));
          if (checkoutFinal["cod_enabled"] === false) {
            const upiFinal = finalOf("upi") ?? (await readKey(admin, "upi"));
            const upiOk =
              upiFinal["enabled"] === true &&
              typeof upiFinal["upi_id"] === "string" &&
              UPI_ID_REGEX.test(upiFinal["upi_id"]);
            const rzpOk = !!(await getRazorpayConfig());
            if (!upiOk && !rzpOk) {
              return badRequest(
                "COD बंद करण्यापूर्वी UPI सुरू करा (वैध UPI ID टाकून) — नाहीतर ग्राहकांना पेमेंटचा पर्याय राहणार नाही.",
              );
            }
          }
          if (rows.length > 0) {
            const { error } = await admin
              .from("admin_settings")
              .upsert(rows, { onConflict: "key" });
            if (error) return serverError("Could not save settings");
          }
          if (parsed.data.color_picker_enabled !== undefined) {
            // Lives in the public site_content table so the landing page can hide the
            // picker during server-side rendering (no flash of the old UI).
            const { error } = await admin.from("site_content").upsert(
              {
                key: "feature_color_picker",
                value: parsed.data.color_picker_enabled ? "on" : "off",
              },
              { onConflict: "key" },
            );
            if (error) return serverError("Could not save settings");
          }
          return json({ ok: true });
        } catch (err) {
          console.error("[store-settings PUT]", err);
          return serverError();
        }
      },
    },
  },
});
