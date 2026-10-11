import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY Supabase client using the service role key. This module must never
// be imported from client-bundled code. It is only imported inside server route
// handlers (src/routes/api/**), which Vite/Nitro bundle server-side.
if (typeof window !== "undefined") {
  throw new Error("supabase.server.ts must not be imported in the browser bundle");
}

let cached: SupabaseClient | null = null;

export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  // URL is a public value; use the Vite-injected constant which is available on
  // both server and client builds. The service role key is a secret from process.env.
  const url =
    (import.meta.env["VITE_SUPABASE_URL"] as string) || process.env["VITE_SUPABASE_URL"] || "";
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or Supabase URL on the server");
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Verifies a Supabase Auth access token and returns the user, or null if invalid.
// Any authenticated Supabase user is treated as an admin for this single-tenant store.
export async function requireAdmin(request: Request) {
  const header = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const admin = getAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) {
      console.error("[requireAdmin] token rejected:", error?.message);
      return null;
    }
    return data.user;
  } catch (err) {
    // Almost always a missing SUPABASE_SERVICE_ROLE_KEY — see /api/health.
    console.error("[requireAdmin] server misconfigured:", (err as Error).message);
    return null;
  }
}

export function unauthorized() {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  });
}
