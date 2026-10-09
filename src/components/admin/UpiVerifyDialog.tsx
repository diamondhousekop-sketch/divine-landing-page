import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminFetch } from "@/lib/admin-api";
import type { Order } from "@/lib/types";

function waPhone(phone: string): string {
  return `91${(phone || "").replace(/\D/g, "").slice(-10)}`;
}

// Ready-made WhatsApp message for the customer after the owner's decision.
export function upiWhatsappLink(o: Order): string {
  const msg =
    o.payment_status === "paid"
      ? `नमस्कार ${o.customer_name} 🙏, Diamond House कडून — तुमच्या ऑर्डर ${o.order_number} चे ₹${Number(o.total_amount)} UPI पेमेंट मिळाले आहे ✅. तुमची ऑर्डर कन्फर्म झाली असून पूजा करून लवकरच पाठवली जाईल. धन्यवाद!`
      : `नमस्कार ${o.customer_name} 🙏, Diamond House कडून — तुमच्या ऑर्डर ${o.order_number} चे ₹${Number(o.total_amount)} UPI पेमेंट आम्हाला अजून मिळालेले दिसत नाही. कृपया पेमेंट तपासा किंवा योग्य स्क्रीनशॉट / UTR या नंबरवर पाठवा.`;
  return `https://wa.me/${waPhone(o.customer_phone)}?text=${encodeURIComponent(msg)}`;
}

export function UpiVerifyDialog({
  order,
  onClose,
  onUpdated,
}: {
  order: Order | null;
  onClose: () => void;
  onUpdated: (o: Order) => void;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loadingImg, setLoadingImg] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState<Order | null>(null);

  useEffect(() => {
    setImgUrl(null);
    setError(null);
    setChecked(false);
    setDone(null);
    if (!order?.payment_proof_path) return;
    let alive = true;
    setLoadingImg(true);
    adminFetch<{ url: string | null }>("/api/admin/upi", { params: { order_id: order.id } })
      .then((d) => alive && setImgUrl(d.url))
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load"))
      .finally(() => alive && setLoadingImg(false));
    return () => {
      alive = false;
    };
  }, [order?.id, order?.payment_proof_path]);

  if (!order) return null;
  const current = done ?? order;

  const act = async (action: "approve" | "reject") => {
    setBusy(action);
    setError(null);
    try {
      const d = await adminFetch<{ order: Order }>("/api/admin/upi", {
        method: "POST",
        body: { order_id: order.id, action },
      });
      setDone(d.order);
      onUpdated(d.order);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={!!order} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-navy">
            UPI पेमेंट तपासा · {order.order_number}
          </DialogTitle>
          <DialogDescription className="deva">
            {order.customer_name} · {order.customer_phone}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-navy px-4 py-3 text-center text-gold-light">
          <p className="deva text-xs opacity-80">बँकेत ही रक्कम आली आहे का तपासा</p>
          <p className="font-display text-3xl font-bold text-gold">₹{Number(order.total_amount)}</p>
        </div>

        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">UTR</dt>
          <dd className="break-all font-medium">{order.upi_utr || "— (दिला नाही)"}</dd>
          <dt className="text-muted-foreground">Submitted</dt>
          <dd>
            {order.payment_submitted_at
              ? new Date(order.payment_submitted_at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "— (स्क्रीनशॉट अजून नाही)"}
          </dd>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="font-medium">{current.payment_status}</dd>
        </dl>

        <div className="overflow-hidden rounded-xl border border-border bg-secondary/30">
          {loadingImg ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : imgUrl ? (
            <a href={imgUrl} target="_blank" rel="noreferrer" className="group relative block">
              <img
                src={imgUrl}
                alt="Customer payment screenshot"
                className="mx-auto max-h-[50vh] w-auto object-contain"
              />
              <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-navy/80 px-2 py-1 text-[11px] text-white">
                <ExternalLink className="h-3 w-3" /> पूर्ण पहा
              </span>
            </a>
          ) : (
            <p className="deva p-6 text-center text-sm text-muted-foreground">
              ग्राहकाने अजून स्क्रीनशॉट अपलोड केलेला नाही.
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        {current.payment_status === "paid" || current.payment_status === "failed" ? (
          <div className="space-y-3">
            <p
              className={`deva flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
                current.payment_status === "paid"
                  ? "bg-[color-mix(in_oklab,var(--whatsapp)_15%,transparent)] text-[var(--whatsapp)]"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {current.payment_status === "paid" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> पेमेंट मिळाले — ऑर्डर कन्फर्म झाली.
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" /> पेमेंट मिळाले नाही असे नोंदवले.
                </>
              )}
            </p>
            <a
              href={upiWhatsappLink(current)}
              target="_blank"
              rel="noreferrer"
              data-testid="upi-whatsapp-customer"
              className="deva inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[var(--whatsapp)] px-5 text-sm font-semibold text-white"
            >
              <MessageCircle className="h-4 w-4" /> ग्राहकाला WhatsApp वर कळवा
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="deva flex items-start gap-2 rounded-xl border border-accent/50 bg-[color-mix(in_oklab,var(--gold)_12%,transparent)] px-4 py-3 text-xs leading-relaxed text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              स्क्रीनशॉट खोटा असू शकतो. आधी तुमच्या GPay / PhonePe / Paytm / बँक ॲपमध्ये ₹
              {Number(order.total_amount)} {order.upi_utr ? `व UTR ${order.upi_utr}` : ""} आले आहे
              का खात्री करा.
            </p>
            <label className="deva flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                data-testid="upi-checked-bank"
              />
              मी बँक / UPI ॲपमध्ये पैसे आल्याचे तपासले आहे
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => act("reject")}
                disabled={!!busy}
                data-testid="upi-reject"
                className="deva inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-full border border-destructive/60 px-3 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {busy === "reject" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                मिळाले नाही
              </button>
              <button
                onClick={() => act("approve")}
                disabled={!!busy || !checked}
                data-testid="upi-approve"
                className="deva inline-flex min-h-[46px] items-center justify-center gap-1.5 rounded-full bg-navy px-3 text-sm font-semibold text-gold-light disabled:opacity-50"
              >
                {busy === "approve" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                पेमेंट मिळाले
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
