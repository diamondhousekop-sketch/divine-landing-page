import { createFileRoute } from "@tanstack/react-router";
import { getAdminClient } from "@/lib/supabase.server";
import { json } from "@/lib/http.server";
import { getEnv, visibleEnvNames } from "@/lib/env.server";

// Public setup check. It reports ONLY yes/no (never a value) so you can open
// /api/health after a deploy and see exactly which setting is missing or wrong.
const env = getEnv;

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: async () => {
        const url = (import.meta.env["VITE_SUPABASE_URL"] as string) || env("VITE_SUPABASE_URL");
        const key = env("SUPABASE_SERVICE_ROLE_KEY");
        const checks: Record<string, boolean> = {
          supabase_url_set: !!url,
          service_role_key_set: !!key,
          service_role_key_looks_valid: key.startsWith("eyJ") || key.startsWith("sb_secret_"),
          site_url_set: !!env("SITE_URL"),
          upi_proof_secret_set: !!env("UPI_PROOF_SECRET"),
          resend_api_key_set: !!env("RESEND_API_KEY"),
          resend_from_email_set: !!env("RESEND_FROM_EMAIL"),
          admin_alert_email_set: !!env("ADMIN_ALERT_EMAIL"),
        };

        let database_ok = false;
        let auth_ok = false;
        let hint = "";
        try {
          const admin = getAdminClient();
          const { error } = await admin.from("admin_settings").select("key").limit(1);
          database_ok = !error;
          if (error) hint = "Supabase ne service key reject ki (key galat ya adhuri hai).";
          // A fake token must be rejected as "invalid token", not as a bad API key.
          const r = await admin.auth.getUser("health-check-token");
          const msg = (r.error?.message || "").toLowerCase();
          auth_ok = !!r.error && !msg.includes("api key") && !msg.includes("apikey");
        } catch (e) {
          hint = (e as Error).message || "Server config missing";
        }

        const required = [
          "supabase_url_set",
          "service_role_key_set",
          "service_role_key_looks_valid",
        ];
        const ok = required.every((k) => checks[k]) && database_ok && auth_ok;
        return json(
          {
            ok,
            checks,
            database_ok,
            admin_login_check_ok: auth_ok,
            hint,
            // Variable NAMES the host handed to the server (never values).
            seen_by_server: visibleEnvNames(),
          },
          ok ? 200 : 503,
        );
      },
    },
  },
});
