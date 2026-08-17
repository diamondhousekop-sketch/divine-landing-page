import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { IndianRupee, ShoppingBag, Clock, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/lib/admin-api";
import type { Order } from "@/lib/types";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard | Diamond House Admin" }] }),
  component: Dashboard,
});

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function Dashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<{ orders: Order[] }>("/api/admin/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  const today = startOfToday().getTime();
  const list = orders ?? [];
  const paid = list.filter((o) => o.payment_status === "paid");
  const revenue = paid.reduce((s, o) => s + Number(o.total_amount), 0);
  const ordersToday = list.filter((o) => new Date(o.created_at).getTime() >= today).length;
  const pending = list.filter((o) => o.order_status === "placed").length;

  // Last 7 days revenue chart
  const days: { label: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = d.getTime() + 86_400_000;
    const dayOrders = list.filter((o) => {
      const t = new Date(o.created_at).getTime();
      return t >= d.getTime() && t < next;
    });
    days.push({
      label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: dayOrders
        .filter((o) => o.payment_status === "paid")
        .reduce((s, o) => s + Number(o.total_amount), 0),
      orders: dayOrders.length,
    });
  }

  const stats = [
    { label: "आजच्या ऑर्डर्स", en: "Orders today", value: ordersToday, icon: ShoppingBag },
    { label: "एकूण ऑर्डर्स", en: "Total orders", value: list.length, icon: TrendingUp },
    {
      label: "एकूण महसूल",
      en: "Revenue (paid)",
      value: `₹${revenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
    },
    { label: "प्रलंबित", en: "Pending", value: pending, icon: Clock },
  ];

  return (
    <AdminLayout title="डॅशबोर्ड">
      {error && (
        <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="dashboard-stats">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.en} className="surface-card p-5">
              <div className="flex items-center justify-between">
                <span className="deva text-xs text-muted-foreground">{s.label}</span>
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 font-display text-3xl font-bold text-navy">
                {orders === null ? "…" : s.value}
              </p>
              <p className="text-[11px] text-muted-foreground">{s.en}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-card mt-6 p-5">
        <h2 className="deva text-lg text-foreground">मागील ७ दिवस — महसूल</h2>
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
                formatter={(v: number) => [`₹${v}`, "Revenue"]}
              />
              <Bar dataKey="revenue" fill="var(--gold)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </AdminLayout>
  );
}
