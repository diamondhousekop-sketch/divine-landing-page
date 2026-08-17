import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminSession } from "@/hooks/use-admin";
import { GoldSwash } from "@/components/GoldSwash";

export const Route = createFileRoute("/admin/login")({
  head: () => ({ meta: [{ title: "Admin Login | Diamond House" }] }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const { session, loading } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/admin" });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    navigate({ to: "/admin" });
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-ring/40";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden px-5 py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-glow)", opacity: 0.4 }}
      />
      <div className="surface-card w-full max-w-md p-8">
        <div className="text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold text-xl">
            🪔
          </span>
          <h1 className="mt-4 font-display text-2xl text-navy">Admin Panel</h1>
          <p className="deva text-xs text-muted-foreground">Diamond House, कोल्हापूर</p>
          <GoldSwash className="mx-auto mt-3 w-32" />
        </div>

        <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
          <div>
            <label className="text-sm text-foreground">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              data-testid="login-email"
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-sm text-foreground">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              data-testid="login-password"
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive" data-testid="login-error">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            data-testid="login-submit"
            className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-navy px-8 text-base font-semibold text-gold-light transition-transform hover:scale-[1.02] disabled:opacity-70"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
