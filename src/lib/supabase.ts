import { createClient } from "@supabase/supabase-js";

// Browser-safe client. Uses the public anon key + RLS. Safe to bundle to the client.
// Reads from Vite-injected env (import.meta.env.VITE_*).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // Surface a clear message during development instead of a cryptic runtime error.
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Public data will fall back to defaults.",
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "diamond-house-admin-auth",
  },
});
