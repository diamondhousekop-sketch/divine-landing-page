import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";

// Admin-managed Razorpay credentials, stored in admin_settings (service-role only).
// GET returns a MASKED view (secrets never leave the server in full).
const PutInput = z.object({
  key_id: z.string().trim().max(200).optional().or(z.literal("")),
  key_secret: z.string().trim().max(200).optional().or(z.literal("")),
  webhook_secret: z.string().trim().max(200).optional().or(z.literal("")),
  enabled: z.boolean().optional(),
});

function mask(v: string | undefined | null): string {
  if (!v) return "";
  if (v.length <= 4) return "••••";
  return `${v.slice(0, 4)}••••${v.slice(-2)}`;
}

export const Route = createFileRoute("/api/admin/settings")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        try {
          const admin = getAdminClient();
          const { data } = await admin
            .from("admin_settings")
            .select("value")
            .eq("key", "razorpay")
            .maybeSingle();
          const v = (data?.value ?? {}) as Record<string, string>;
          return json({
            razorpay: {
              key_id: v.key_id ?? "",
              key_secret_masked: mask(v.key_secret),
              webhook_secret_masked: mask(v.webhook_secret),
              has_key_secret: !!v.key_secret,
              has_webhook_secret: !!v.webhook_secret,
              enabled: !!v.enabled,
            },
          });
        } catch (err) {
          console.error("[admin/settings GET]", err);
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
          const { data: existing } = await admin
            .from("admin_settings")
            .select("value")
            .eq("key", "razorpay")
            .maybeSingle();
          const current = (existing?.value ?? {}) as Record<string, unknown>;
          const next = { ...current };
          // Only overwrite secrets when a non-empty value is supplied (empty = keep existing).
          if (parsed.data.key_id !== undefined) next.key_id = parsed.data.key_id;
          if (parsed.data.key_secret) next.key_secret = parsed.data.key_secret;
          if (parsed.data.webhook_secret) next.webhook_secret = parsed.data.webhook_secret;
          if (parsed.data.enabled !== undefined) next.enabled = parsed.data.enabled;

          const { error } = await admin
            .from("admin_settings")
            .upsert({ key: "razorpay", value: next }, { onConflict: "key" });
          if (error) return serverError("Could not save settings");
          return json({ ok: true });
        } catch (err) {
          console.error("[admin/settings PUT]", err);
          return serverError();
        }
      },
    },
  },
});
