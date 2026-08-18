import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, MessageCircle, FileDown, Send, Download } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch, adminDownload } from "@/lib/admin-api";
import type { Order, OrderStatus, PaymentStatus } from "@/lib/types";
import { useIsMobile } from "@/hooks/use-mobile";

export const Route = createFileRoute("/admin/orders")({
  head: () => ({ meta: [{ title: "Orders | Diamond House Admin" }] }),
  component: OrdersPage,
});

const ORDER_STATUSES: OrderStatus[] = ["placed", "confirmed", "shipped", "delivered", "cancelled"];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed"];

function waPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return `91${last10}`;
}

const STATUS_MSG: Record<string, string> = {
  placed: "आम्हाला तुमची ऑर्डर मिळाली आहे",
  confirmed: "तुमची ऑर्डर कन्फर्म झाली असून पूजा करून पॅक केली जात आहे",
  shipped: "तुमची ऑर्डर पाठवण्यात आली आहे 🚚",
  delivered: "तुमची ऑर्डर पोहोचली आहे 🙏",
  cancelled: "तुमची ऑर्डर रद्द करण्यात आली आहे",
};

function whatsappOrderLink(o: Order): string {
  const status = STATUS_MSG[o.order_status] || "";
  const msg = `नमस्कार ${o.customer_name} 🙏, Diamond House कडून — तुमची ऑर्डर ${o.order_number} ${status}. काही प्रश्न असल्यास कळवा.`;
  return `https://wa.me/${waPhone(o.customer_phone)}?text=${encodeURIComponent(msg)}`;
}

function toCsv(orders: Order[]): string {
  const headers = [
    "order_number",
    "created_at",
    "customer_name",
    "customer_phone",
    "customer_email",
    "customer_address",
    "customer_pincode",
    "quantity",
    "total_amount",
    "payment_method",
    "payment_status",
    "order_status",
  ];
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = orders.map((o) => headers.map((h) => esc((o as Record<string, unknown>)[h])).join(","));
  return [headers.join(","), ...rows].join("\n");
}

const statusColor: Record<string, string> = {
  placed: "bg-secondary text-secondary-foreground",
  confirmed: "bg-navy/10 text-navy",
  shipped: "bg-accent/20 text-accent-foreground",
  delivered: "bg-[color-mix(in_oklab,var(--whatsapp)_20%,transparent)] text-[var(--whatsapp)]",
  cancelled: "bg-destructive/10 text-destructive",
  paid: "bg-[color-mix(in_oklab,var(--whatsapp)_20%,transparent)] text-[var(--whatsapp)]",
  pending: "bg-secondary text-secondary-foreground",
  failed: "bg-destructive/10 text-destructive",
};

function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[value] ?? "bg-secondary"}`}
    >
      {value}
    </span>
  );
}

function OrdersPage() {
  const isMobile = useIsMobile();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (q) params["q"] = q;
      if (statusFilter) params["status"] = statusFilter;
      if (paymentFilter) params["payment"] = paymentFilter;
      const d = await adminFetch<{ orders: Order[] }>("/api/admin/orders", { params });
      setOrders(d.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, paymentFilter]);

  useEffect(() => {
    load();
  }, [statusFilter, paymentFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (
    id: string,
    field: "order_status" | "payment_status",
    value: string,
  ) => {
    try {
      const d = await adminFetch<{ order: Order }>("/api/admin/orders", {
        method: "PATCH",
        body: { id, [field]: value },
      });
      setOrders((prev) => prev.map((o) => (o.id === id ? d.order : o)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Update failed");
    }
  };

  const selectCls = "rounded-lg border border-border bg-card px-2 py-1 text-xs text-foreground";

  const [busyId, setBusyId] = useState<string | null>(null);

  const downloadInvoice = async (o: Order) => {
    setBusyId(o.id);
    try {
      await adminDownload(`/api/admin/invoice?order_id=${o.id}`, `Invoice-${o.order_number}.pdf`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Invoice download failed");
    } finally {
      setBusyId(null);
    }
  };

  const resendInvoice = async (o: Order) => {
    if (!confirm(`ग्राहकाला (${o.customer_email || "ईमेल नाही"}) बिल पुन्हा पाठवायचे?`)) return;
    setBusyId(o.id);
    try {
      const d = await adminFetch<{ invoice_number: string; emailed_to: string }>(
        "/api/admin/invoice",
        { method: "POST", body: { order_id: o.id } },
      );
      alert(`बिल ${d.invoice_number} पाठवले → ${d.emailed_to}`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Resend failed");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const csv = toCsv(orders);
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diamond-house-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const actionBtns = (o: Order) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <a
        href={whatsappOrderLink(o)}
        target="_blank"
        rel="noreferrer"
        title="WhatsApp ग्राहक"
        data-testid={`order-whatsapp-${o.order_number}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--whatsapp)] text-[var(--whatsapp)] hover:bg-[color-mix(in_oklab,var(--whatsapp)_12%,transparent)]"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
      <button
        onClick={() => downloadInvoice(o)}
        disabled={busyId === o.id}
        title="बिल डाउनलोड (PDF)"
        data-testid={`order-invoice-download-${o.order_number}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-navy hover:bg-secondary disabled:opacity-50"
      >
        <FileDown className="h-4 w-4" />
      </button>
      <button
        onClick={() => resendInvoice(o)}
        disabled={busyId === o.id}
        title="बिल ईमेल करा"
        data-testid={`order-invoice-resend-${o.order_number}`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-navy hover:bg-secondary disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <AdminLayout title="ऑर्डर्स">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="नाव / फोन / ऑर्डर क्र. शोधा"
            className="deva w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            data-testid="orders-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectCls + " py-2 text-sm"}
          data-testid="orders-status-filter"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className={selectCls + " py-2 text-sm"}
          data-testid="orders-payment-filter"
        >
          <option value="">All payments</option>
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary"
          data-testid="orders-refresh"
        >
          <RefreshCw className="h-4 w-4" /> रिफ्रेश
        </button>
        <button
          onClick={exportCsv}
          disabled={orders.length === 0}
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-secondary disabled:opacity-50"
          data-testid="orders-export-csv"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && <p className="deva text-sm text-muted-foreground">लोड होत आहे…</p>}

      {!loading && orders.length === 0 && (
        <div className="surface-card p-10 text-center">
          <p className="deva text-muted-foreground">अजून कोणतीही ऑर्डर नाही.</p>
        </div>
      )}

      {/* Mobile card view */}
      {!loading && isMobile && orders.length > 0 && (
        <div className="space-y-3" data-testid="orders-cards">
          {orders.map((o) => (
            <div
              key={o.id}
              className="surface-card p-4"
              data-testid={`order-card-${o.order_number}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-navy">{o.order_number}</span>
                <span className="font-display text-lg font-bold text-navy">
                  ₹{Number(o.total_amount)}
                </span>
              </div>
              <p className="deva mt-1 text-sm text-foreground">
                {o.customer_name} · {o.customer_phone}
              </p>
              <p className="deva text-xs text-muted-foreground">
                {o.customer_address}, {o.customer_pincode}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge value={o.payment_method} />
                <select
                  value={o.order_status}
                  onChange={(e) => updateStatus(o.id, "order_status", e.target.value)}
                  className={selectCls}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={o.payment_status}
                  onChange={(e) => updateStatus(o.id, "payment_status", e.target.value)}
                  className={selectCls}
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-3 border-t border-border/60 pt-3">{actionBtns(o)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      {!loading && !isMobile && orders.length > 0 && (
        <div className="surface-card overflow-x-auto p-0" data-testid="orders-table">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-border/60 hover:bg-secondary/40"
                  data-testid={`order-row-${o.order_number}`}
                >
                  <td className="px-4 py-3 font-medium text-navy">{o.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="deva text-foreground">{o.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {o.customer_phone} · {o.customer_pincode}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium">₹{Number(o.total_amount)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Badge value={o.payment_method} />
                      <select
                        value={o.payment_status}
                        onChange={(e) => updateStatus(o.id, "payment_status", e.target.value)}
                        className={selectCls}
                      >
                        {PAYMENT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={o.order_status}
                      onChange={(e) => updateStatus(o.id, "order_status", e.target.value)}
                      className={selectCls}
                      data-testid={`order-status-${o.order_number}`}
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">{actionBtns(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
