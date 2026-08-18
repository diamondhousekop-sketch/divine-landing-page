import { createClient } from "@supabase/supabase-js";

// Browser-safe client. Uses the public anon key + RLS. Safe to bundle to the client.
// Reads from Vite-injected env (import.meta.env.VITE_*) — these are baked in at
// BUILD time, not read at server start. If .env was missing when `vite build`
// ran, these will be empty here even if the env is set correctly at runtime.
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear message instead of a cryptic runtime error. A placeholder
  // URL keeps createClient() from throwing and crashing SSR for every route;
  // actual requests will fail and are caught by the try/catch in queries.ts,
  // so the landing page still renders using its fallback content.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY at build time. " +
      "Public data will fall back to defaults. Rebuild with a valid .env present.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "diamond-house-admin-auth",
    },
  },
);
