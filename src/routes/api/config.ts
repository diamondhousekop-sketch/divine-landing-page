import { createFileRoute } from "@tanstack/react-router";
import { getRazorpayConfig } from "@/lib/razorpay.server";
import { getAdminClient } from "@/lib/supabase.server";
import { json } from "@/lib/http.server";

// Public, client-safe config: whether online payment is available (+ public
// Razorpay key id) and the PUBLIC marketing identifiers (Meta Pixel / GA4 / GTM
// / Search Console). No secrets are ever returned here.
export const Route = createFileRoute("/api/config")({
  server: {
    handlers: {
      GET: async () => {
        const cfg = await getRazorpayConfig();

        let marketing: Record<string, string> = {};
        try {
          const admin = getAdminClient();
          const { data } = await admin
            .from("admin_settings")
            .select("value")
            .eq("key", "marketing")
            .maybeSingle();
          if (data?.value) marketing = data.value as Record<string, string>;
        } catch {
          /* table may not exist yet — degrade to empty */
        }

        return json({
          online_enabled: !!cfg,
          razorpay_key_id: cfg?.key_id ?? "",
          meta_pixel_id: marketing["meta_pixel_id"] ?? "",
          ga4_id: marketing["ga4_id"] ?? "",
          gtm_id: marketing["gtm_id"] ?? "",
          gsc_verification: marketing["gsc_verification"] ?? "",
        });
      },
    },
  },
});
