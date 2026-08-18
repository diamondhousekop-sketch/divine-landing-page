import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  CheckCircle2,
  MessageCircle,
  Phone,
  PackageCheck,
  Truck,
  Home,
  Sparkles,
  MapPin,
} from "lucide-react";
import { GoldSwash } from "@/components/GoldSwash";
import { getSiteContent } from "@/lib/queries";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/order-confirmation")({
  head: () => ({ meta: [{ title: "धन्यवाद! ऑर्डर नोंदवली | Diamond House" }] }),
  validateSearch: (
    search: Record<string, unknown>,
  ): { order?: string; amt?: number; m?: string } => {
    const result: { order?: string; amt?: number; m?: string } = {};
    if (typeof search["order"] === "string") result.order = search["order"];
    if (search["amt"] != null && !Number.isNaN(Number(search["amt"])))
      result.amt = Number(search["amt"]);
    if (search["m"] === "online" || search["m"] === "cod") result.m = search["m"];
    return result;
  },
  loader: async () => ({ content: await getSiteContent() }),
  component: OrderConfirmation,
});

function toEmbed(url: string): { type: "iframe" | "video"; src: string } | null {
  if (!url) return null;
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (yt) return { type: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vm) return { type: "iframe", src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { type: "video", src: u };
  return null;
}

const WA_PHONE = "919657130131";

function OrderConfirmation() {
  const { order, amt, m } = Route.useSearch();
  const { content } = Route.useLoaderData();
  const isOnline = m === "online";

  // Purchase conversion — the true conversion moment (paid online orders).
  useEffect(() => {
    if (isOnline && amt) {
      track("Purchase", "purchase", {
        currency: "INR",
        value: amt,
        transaction_id: order,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const waText = encodeURIComponent(
    `नमस्कार Diamond House 🙏, माझी ऑर्डर क्रमांक ${order ?? ""} बद्दल माहिती हवी आहे.`,
  );
  const video = toEmbed(content["founder_video_url"] || "");

  const steps = [
    { icon: CheckCircle2, title: "ऑर्डर कन्फर्म", desc: "तुमची ऑर्डर आम्हाला मिळाली आहे." },
    {
      icon: Sparkles,
      title: "पूजा करून पॅकिंग",
      desc: "श्रद्धेने सिद्ध करून काळजीपूर्वक पॅक केले जाईल.",
    },
    { icon: Truck, title: "पाठवणी", desc: "सुरक्षित पॅकिंगमध्ये तुमच्या पत्त्यावर रवाना." },
    { icon: Home, title: "घरपोच डिलिव्हरी", desc: "साधारण ३–५ कामकाजाच्या दिवसांत पोहोच." },
  ];

  // ── COD: keep the simpler summary ──
  if (!isOnline) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden px-5 py-16">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          style={{ background: "var(--gradient-glow)", opacity: 0.4 }}
        />
        <div
          className="surface-card w-full max-w-lg p-8 text-center md:p-10"
          data-testid="confirmation-card"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--whatsapp)_18%,transparent)]">
            <CheckCircle2 className="h-9 w-9 text-[var(--whatsapp)]" />
          </div>
          <h1 className="deva mt-6 text-3xl font-normal text-primary">धन्यवाद! 🙏</h1>
          <GoldSwash className="mx-auto mt-3 w-40" />
          <p className="deva mt-4 text-base leading-relaxed text-foreground">
            तुमची ऑर्डर यशस्वीरित्या नोंदवली गेली आहे. आमची टीम लवकरच तुम्हाला फोनवर संपर्क करेल.
          </p>
          {order && (
            <div className="mt-6 rounded-2xl border border-accent/40 bg-card px-5 py-4">
              <p className="deva text-xs text-muted-foreground">ऑर्डर क्रमांक</p>
              <p
                className="font-display text-2xl font-bold text-navy"
                data-testid="confirmation-order-number"
              >
                {order}
              </p>
            </div>
          )}
          <div className="mt-8 flex flex-col gap-3">
            <a
              href={`https://wa.me/${WA_PHONE}?text=${waText}`}
              target="_blank"
              rel="noreferrer"
              data-testid="whatsapp-support"
              className="deva inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--whatsapp)] px-6 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp वर संपर्क करा
            </a>
            <Link
              to="/track"
              search={order ? { order } : {}}
              className="deva inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              data-testid="track-link"
            >
              <MapPin className="h-4 w-4" /> ऑर्डरचा मागोवा घ्या
            </Link>
            <Link
              to="/"
              className="deva mt-1 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
            >
              मुख्य पानावर परत जा
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Online paid: rich success journey ──
  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-12 md:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-glow)", opacity: 0.35 }}
      />
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--whatsapp)_18%,transparent)]">
            <CheckCircle2 className="h-9 w-9 text-[var(--whatsapp)]" />
          </div>
          <h1 className="deva mt-5 text-3xl font-normal text-primary md:text-4xl">
            पेमेंट यशस्वी! धन्यवाद 🙏
          </h1>
          <GoldSwash className="mx-auto mt-3 w-44" />
          <p className="deva mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
            स्वामींच्या आशीर्वादाने तुमची ऑर्डर निश्चित झाली आहे. खाली आमच्याकडून एक छोटासा संदेश
            आहे.
          </p>
        </div>

        {/* Founder video */}
        {video && (
          <div
            className="mt-8 overflow-hidden rounded-3xl border-2 border-accent/60"
            style={{ boxShadow: "var(--shadow-gold)" }}
            data-testid="founder-video"
          >
            <div className="relative aspect-video w-full bg-navy">
              {video.type === "iframe" ? (
                <iframe
                  src={video.src}
                  title="Founder message"
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={video.src}
                  controls
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </div>
            <p className="deva bg-navy px-4 py-2 text-center text-xs text-gold-light">
              Diamond House कडून तुमच्यासाठी विशेष संदेश
            </p>
          </div>
        )}

        {/* Order summary */}
        <div className="surface-card mt-6 p-6" data-testid="confirmation-card">
          <h2 className="deva text-lg text-foreground">ऑर्डर तपशील</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="deva text-muted-foreground">ऑर्डर क्रमांक</span>
              <span
                className="font-display font-bold text-navy"
                data-testid="confirmation-order-number"
              >
                {order}
              </span>
            </div>
            {amt != null && (
              <div className="flex justify-between">
                <span className="deva text-muted-foreground">भरलेली रक्कम</span>
                <span className="font-display text-lg font-bold text-navy">₹{amt}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="deva text-muted-foreground">पेमेंट पद्धत</span>
              <span className="text-foreground">Online (Razorpay) ✅</span>
            </div>
          </div>
        </div>

        {/* What happens next — vertical stepper from existing primitives */}
        <div className="surface-card mt-6 p-6" data-testid="next-steps-timeline">
          <h2 className="deva text-lg text-foreground">पुढे काय होणार?</h2>
          <ol className="mt-5 space-y-0">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const last = i === steps.length - 1;
              return (
                <li key={s.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {!last && (
                    <span
                      className="absolute left-5 top-11 h-[calc(100%-1.5rem)] w-px bg-border"
                      aria-hidden
                    />
                  )}
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold bg-ivory/90 text-primary">
                    <Icon className="h-4 w-4 text-accent" />
                  </span>
                  <div className="pt-1">
                    <p className="deva font-medium text-foreground">{s.title}</p>
                    <p className="deva text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Trust reinforcement */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 px-5 py-4">
          <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="deva text-xs leading-relaxed text-muted-foreground">
            प्रत्येक शुभरत्न हे श्रद्धेने, हाताने सिद्ध केलेले असते. हे पूजन वस्तू असल्याने परत
            घेतले जात नाही — मात्र काही अडचण असल्यास आम्ही तुमच्यासोबत आहोत.
          </p>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col gap-3">
          <a
            href={`https://wa.me/${WA_PHONE}?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            data-testid="whatsapp-support"
            className="deva inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[var(--whatsapp)] px-6 text-sm font-semibold text-[var(--whatsapp)] transition-colors hover:bg-[color-mix(in_oklab,var(--whatsapp)_12%,transparent)]"
          >
            <MessageCircle className="h-4 w-4" /> काही प्रश्न आहे? आम्हाला व्हाट्सअॅप करा
          </a>
          <div className="flex gap-3">
            <Link
              to="/track"
              search={order ? { order } : {}}
              className="deva inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              data-testid="track-link"
            >
              <MapPin className="h-4 w-4" /> मागोवा
            </Link>
            <a
              href="tel:+919657130131"
              className="deva inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Phone className="h-4 w-4" /> कॉल
            </a>
          </div>
          <Link
            to="/"
            className="deva mt-1 text-center text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            मुख्य पानावर परत जा
          </Link>
        </div>
      </div>
    </main>
  );
}
