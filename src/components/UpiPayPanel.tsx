import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Check,
  Copy,
  ImageUp,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import {
  buildAppLink,
  buildUpiLink,
  detectPlatform,
  UPI_APPS,
  UTR_REGEX,
  type UpiPlatform,
} from "@/lib/upi";
import { UpiAppTile } from "@/components/UpiAppBadges";
import { publicPost } from "@/lib/admin-api";

export type UpiPending = {
  order: { id: string; order_number: string; total_amount: number };
  upi: { upi_id: string; payee_name: string; proof_token: string };
};

const SUPPORT_WA = "919657130131";
const MAX_SIDE = 1600;
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

// Shrinks a phone screenshot (often 2–6MB) to a clear ~200–500KB JPEG so the
// upload is fast on mobile data. Throws if the browser cannot read the image.
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.85, 0.7, 0.55]) {
      const dataUrl = canvas.toDataURL("image/jpeg", q);
      if (dataUrl.length * 0.75 <= MAX_UPLOAD_BYTES) return dataUrl;
    }
    throw new Error("too-large");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function usePlatform(): UpiPlatform {
  const [platform, setPlatform] = useState<UpiPlatform>("other");
  useEffect(() => {
    setPlatform(detectPlatform(navigator.userAgent));
  }, []);
  return platform;
}

export function UpiPayPanel({
  pending,
  onPaid,
}: {
  pending: UpiPending;
  onPaid: (r: { order_number: string; total_amount: number }) => void;
}) {
  const { order, upi } = pending;
  const platform = usePlatform();
  const isPhone = platform !== "other";
  const link = useMemo(
    () => buildUpiLink(upi, order.total_amount, order.order_number),
    [upi, order.total_amount, order.order_number],
  );

  const [qr, setQr] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState<"id" | "amt" | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [utr, setUtr] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, {
      margin: 1,
      width: 260,
      errorCorrectionLevel: "M",
      color: { dark: "#1B2A4B", light: "#FFFFFF" },
    })
      .then((d) => alive && setQr(d))
      .catch(() => alive && setQr(null));
    return () => {
      alive = false;
    };
  }, [link]);

  useEffect(() => {
    if (!file) return setPreview(null);
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const copy = async (text: string, which: "id" | "amt") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard blocked — the text is visible anyway */
    }
  };

  const pickFile = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("कृपया पेमेंटचा स्क्रीनशॉट (फोटो) निवडा.");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setError("फोटो खूप मोठा आहे. कृपया स्क्रीनशॉट निवडा.");
      return;
    }
    setFile(f);
  };

  const utrClean = utr.replace(/\s/g, "");
  const utrInvalid = utrClean.length > 0 && !UTR_REGEX.test(utrClean);

  const submit = async () => {
    setError(null);
    if (!file) {
      setError("पेमेंट झाल्यावर त्याचा स्क्रीनशॉट अपलोड करा.");
      return;
    }
    if (utrInvalid) {
      setError("UTR / Transaction ID १२ अंकी असतो. माहित नसल्यास रिकामे ठेवा.");
      return;
    }
    setSending(true);
    try {
      let dataUrl: string;
      try {
        dataUrl = await compressImage(file);
      } catch {
        throw new Error("हा फोटो वाचता आला नाही. कृपया JPG/PNG स्क्रीनशॉट निवडा.");
      }
      const r = await publicPost<{ ok: boolean; order_number: string; total_amount?: number }>(
        "/api/payment/upi-proof",
        { order_id: order.id, token: upi.proof_token, utr: utrClean, data_url: dataUrl },
      );
      onPaid({
        order_number: r.order_number || order.order_number,
        total_amount: r.total_amount ?? order.total_amount,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        /UTR is already used/i.test(msg)
          ? "हा UTR आधीच दुसऱ्या ऑर्डरसाठी वापरला आहे. कृपया तपासा."
          : /[ऀ-ॿ]/.test(msg)
            ? msg
            : "अपलोड झाले नाही. नेटवर्क तपासून पुन्हा प्रयत्न करा.",
      );
      setSending(false);
    }
  };

  const waHelp = `https://wa.me/${SUPPORT_WA}?text=${encodeURIComponent(
    `नमस्कार Diamond House 🙏, ऑर्डर ${order.order_number} साठी UPI पेमेंट करताना अडचण येत आहे.`,
  )}`;

  return (
    <div className="surface-card p-6 md:p-8" data-testid="upi-panel">
      {/* Amount header */}
      <div className="rounded-2xl bg-navy px-5 py-5 text-center text-gold-light">
        <p className="deva text-xs opacity-80">ऑर्डर क्र. {order.order_number}</p>
        <p className="deva mt-1 text-sm">भरायची रक्कम</p>
        <p className="font-display mt-1 text-4xl font-bold text-gold" data-testid="upi-amount">
          ₹{order.total_amount}
        </p>
      </div>

      {/* STEP 1 — pay */}
      <div className="mt-6">
        <p className="deva flex items-center gap-2 text-base text-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">
            १
          </span>
          UPI ने पेमेंट करा
        </p>

        {isPhone && (
          <div className="mt-4" data-testid="upi-app-picker">
            <p className="deva text-center text-xs text-muted-foreground">
              तुमच्या UPI ॲपवर टॅप करा — ₹{order.total_amount} आणि दुकानाची UPI ID आपोआप भरली जाईल
            </p>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {UPI_APPS.map((app) => (
                <a
                  key={app.id}
                  href={buildAppLink(app, upi, order.total_amount, order.order_number, platform)}
                  data-testid={`upi-app-${app.id}`}
                  className="flex flex-col items-center rounded-2xl border border-border bg-card px-1 py-2.5 transition active:scale-95"
                >
                  <UpiAppTile app={app} compact />
                </a>
              ))}
            </div>
            <a
              href={link}
              data-testid="upi-open-app"
              className="shimmer cta-gold-pulse relative mt-4 inline-flex min-h-[54px] w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-[var(--whatsapp)] px-6 text-base font-semibold text-white"
            >
              <Smartphone className="relative z-10 h-5 w-5" />
              <span className="deva relative z-10">
                इतर कोणत्याही UPI ॲपने ₹{order.total_amount} भरा
              </span>
            </a>
          </div>
        )}

        {(!isPhone || showQr) && qr && (
          <div className="mt-4 flex flex-col items-center">
            <img
              src={qr}
              alt={`UPI QR code for ₹${order.total_amount}`}
              width={220}
              height={220}
              className="rounded-xl border border-border bg-white p-2"
              data-testid="upi-qr"
            />
            <p className="deva mt-2 text-center text-xs text-muted-foreground">
              कोणत्याही UPI ॲपने हा QR स्कॅन करा — रक्कम आपोआप भरली जाईल
            </p>
          </div>
        )}
        {isPhone && !showQr && (
          <button
            type="button"
            onClick={() => setShowQr(true)}
            className="deva mt-3 w-full text-center text-xs text-muted-foreground underline underline-offset-4"
          >
            ॲप उघडत नाही? QR कोड दाखवा
          </button>
        )}

        <div className="mt-4 space-y-2 rounded-xl border border-border bg-secondary/40 p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="deva text-xs text-muted-foreground">UPI ID ({upi.payee_name})</p>
              <p className="truncate font-medium text-foreground" data-testid="upi-id">
                {upi.upi_id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copy(upi.upi_id, "id")}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
            >
              {copied === "id" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="deva">{copied === "id" ? "कॉपी झाले" : "कॉपी"}</span>
            </button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="deva text-xs text-muted-foreground">
              रक्कम: <span className="font-medium text-foreground">₹{order.total_amount}</span>
            </p>
            <button
              type="button"
              onClick={() => copy(String(order.total_amount), "amt")}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs"
            >
              {copied === "amt" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="deva">{copied === "amt" ? "कॉपी झाले" : "कॉपी"}</span>
            </button>
          </div>
        </div>
        <p className="deva mt-2 text-xs text-muted-foreground">
          कृपया अचूक ₹{order.total_amount} भरा. पेमेंट झाल्यावर ह्याच पानावर परत या.
        </p>
      </div>

      {/* STEP 2 — upload proof */}
      <div className="mt-8 border-t border-border pt-6">
        <p className="deva flex items-center gap-2 text-base text-foreground">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-xs font-bold text-navy">
            २
          </span>
          पेमेंटचा स्क्रीनशॉट अपलोड करा
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/*"
          className="hidden"
          data-testid="upi-file"
          onChange={(e) => {
            pickFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        {!preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            data-testid="upi-pick"
            className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-accent/60 bg-ivory/60 px-4 py-8 text-center transition-colors hover:bg-secondary/60"
          >
            <ImageUp className="h-7 w-7 text-accent" />
            <span className="deva text-sm font-medium text-foreground">स्क्रीनशॉट निवडा</span>
            <span className="deva text-xs text-muted-foreground">
              पेमेंट यशस्वी झाल्याचे पान (Transaction ID सह)
            </span>
          </button>
        ) : (
          <div className="relative mt-4 overflow-hidden rounded-2xl border border-border bg-white">
            <img
              src={preview}
              alt="Payment screenshot preview"
              className="mx-auto max-h-72 w-auto object-contain"
            />
            <button
              type="button"
              onClick={() => setFile(null)}
              disabled={sending}
              aria-label="Remove screenshot"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-navy/80 text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <label className="deva mt-4 block text-sm text-foreground">
          UTR / Transaction ID (ऐच्छिक)
        </label>
        <input
          value={utr}
          onChange={(e) => setUtr(e.target.value.replace(/[^\d\s]/g, "").slice(0, 16))}
          inputMode="numeric"
          placeholder="१२ अंकी नंबर, उदा. 412345678901"
          data-testid="upi-utr"
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-ring/40"
        />
        {utrInvalid && <p className="deva mt-1 text-xs text-destructive">UTR १२ अंकी असतो.</p>}

        {error && (
          <p
            className="deva mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
            data-testid="upi-error"
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={sending || !file}
          data-testid="upi-submit"
          className="shimmer relative mt-5 inline-flex min-h-[54px] w-full items-center justify-center overflow-hidden rounded-full bg-navy px-8 text-base font-semibold text-gold-light transition-transform duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
        >
          <span className="deva relative z-10 flex items-center gap-2">
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {sending ? "पाठवत आहे…" : "पेमेंट पूर्ण — ऑर्डर कन्फर्म करा"}
          </span>
        </button>

        <p className="deva mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          आम्ही बँकेत रक्कम तपासून तुमची ऑर्डर कन्फर्म करू व WhatsApp वर कळवू. तुमचा स्क्रीनशॉट
          सुरक्षित व खाजगी ठेवला जातो.
        </p>
        <a
          href={waHelp}
          target="_blank"
          rel="noreferrer"
          className="deva mt-3 inline-flex items-center gap-1.5 text-xs text-[var(--whatsapp)]"
        >
          <MessageCircle className="h-3.5 w-3.5" /> पेमेंट करताना अडचण? WhatsApp करा
        </a>
      </div>
    </div>
  );
}
