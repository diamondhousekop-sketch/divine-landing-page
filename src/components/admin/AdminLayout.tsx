import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  MessageSquareQuote,
  Settings2,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useRequireAdmin } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "डॅशबोर्ड", en: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "ऑर्डर्स", en: "Orders", icon: ShoppingBag },
  { to: "/admin/products", label: "प्रॉडक्ट्स", en: "Products", icon: Package },
  { to: "/admin/testimonials", label: "अनुभव", en: "Testimonials", icon: MessageSquareQuote },
  { to: "/admin/content", label: "कंटेंट", en: "Content & Payments", icon: Settings2 },
] as const;

export function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const { session, loading } = useRequireAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="deva text-sm text-muted-foreground" data-testid="admin-loading">
          लोड होत आहे…
        </div>
      </div>
    );
  }

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/admin/login" });
  };

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  const SidebarInner = (
    <div className="flex h-full flex-col bg-navy text-gold-light">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-gold text-lg">
          🪔
        </span>
        <div>
          <p className="font-display text-lg text-gold">Diamond House</p>
          <p className="text-[11px] opacity-70">Admin Panel</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to, "exact" in item ? item.exact : false);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              data-testid={`nav-${item.en.toLowerCase().split(" ")[0]}`}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active ? "bg-gold text-navy font-semibold" : "hover:bg-white/10",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="deva">{item.label}</span>
              <span className="ml-auto text-[10px] opacity-60">{item.en}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <p className="truncate px-3 pb-2 text-[11px] opacity-60">{session.user.email}</p>
        <button
          onClick={signOut}
          data-testid="admin-signout-button"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gold-light transition-colors hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 md:block">{SidebarInner}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{SidebarInner}</div>
        </div>
      )}

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:px-8">
          <button
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            data-testid="admin-menu-toggle"
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <h1 className="font-display text-xl text-navy md:text-2xl" data-testid="admin-page-title">
            {title}
          </h1>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
