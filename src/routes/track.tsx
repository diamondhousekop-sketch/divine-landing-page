import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Loader2,
  Search,
  CheckCircle2,
  Sparkles,
  Truck,
  Home,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { GoldSwash } from "@/components/GoldSwash";
import { publicPost } from "@/lib/admin-api";

export const Route = createFileRoute("/track")({
  head: () => ({ meta: [{ title: "ऑर्डरचा मागोवा | Diamond House" }] }),
  validateSearch: (s: Record<string, unknown>): { order?: string } =>
    typeof s["order"] === "string" ? { order: s["order"] } : {},
  component: TrackPage,
});

const schema = z.object({
  order_number: z.string().trim().min(4, "ऑर्डर क्रमांक टाका"),
  phone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "10 अंकी मोबाईल नंबर टाका"),
});
type FormValues = z.infer<typeof schema>;

type OrderResult = {
  order_number: string;
  customer_name: string;
  pincode: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  quantity: number;
  total_amount: number;
  created_at: string;
};

const FLOW = [
  { key: "placed", title: "ऑर्डर नोंदवली", icon: CheckCircle2 },
  { key: "confirmed", title: "कन्फर्म व पॅकिंग", icon: Sparkles },
  { key: "shipped", title: "पाठवली", icon: Truck },
  { key: "delivered", title: "घरपोच", icon: Home },
];

function TrackPage() {
  const { order: prefillOrder } = Route.useSearch();
  const [result, setResult] = useState<OrderResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (prefillOrder) setValue("order_number", prefillOrder);
  }, [prefillOrder, setValue]);

  const onSubmit = async (values: FormValues) => {
    setLoading(true);
    setNotFound(false);
    setResult(null);
    try {
      const d = await publicPost<{ found: boolean; order?: OrderResult }>("/api/track", values);
      if (d.found && d.order) setResult(d.order);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-ring/40";

  const cancelled = result?.order_status === "cancelled";
  const currentIdx = result ? FLOW.findIndex((f) => f.key === result.order_status) : -1;

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-12 md:py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-glow)", opacity: 0.35 }}
      />
      <div className="mx-auto max-w-lg">
        <Link to="/" className="deva text-sm text-muted-foreground hover:text-primary">
          ← मुख्य पान
        </Link>
        <div className="mt-3 text-center">
          <h1 className="deva text-3xl font-normal text-primary md:text-4xl">
            आपल्या ऑर्डरचा मागोवा घ्या
          </h1>
          <GoldSwash className="mx-auto mt-3 w-44" />
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="surface-card mt-8 p-6"
          data-testid="track-form"
        >
          <div>
            <label className="deva text-sm text-foreground">ऑर्डर क्रमांक</label>
            <input
              className={inputCls}
              placeholder="DH-XXXXXX-XXX"
              data-testid="track-order-number"
              {...register("order_number")}
            />
            {errors.order_number && (
              <p className="deva mt-1 text-xs text-destructive">{errors.order_number.message}</p>
            )}
          </div>
          <div className="mt-4">
            <label className="deva text-sm text-foreground">मोबाईल नंबर (ऑर्डरमधील)</label>
            <input
              className={inputCls}
              inputMode="numeric"
              placeholder="9876543210"
              data-testid="track-phone"
              {...register("phone")}
            />
            {errors.phone && (
              <p className="deva mt-1 text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="track-submit"
            className="deva mt-6 inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full bg-navy px-8 text-base font-semibold text-gold-light transition-transform hover:scale-[1.02] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}{" "}
            मागोवा घ्या
          </button>
        </form>

        {notFound && (
          <div className="surface-card mt-6 p-6 text-center" data-testid="track-notfound">
            <p className="deva text-sm text-foreground">
              ही ऑर्डर सापडली नाही. कृपया ऑर्डर क्रमांक व मोबाईल नंबर तपासा किंवा आम्हाला संपर्क
              करा.
            </p>
            <a
              href="https://wa.me/919657130131"
              target="_blank"
              rel="noreferrer"
              className="deva mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--whatsapp)] px-5 py-2.5 text-sm font-semibold text-[var(--whatsapp)]"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp सहाय्य
            </a>
          </div>
        )}

        {result && (
          <div className="surface-card mt-6 p-6" data-testid="track-result">
            <div className="flex items-center justify-between">
              <div>
                <p className="deva text-xs text-muted-foreground">ऑर्डर क्रमांक</p>
                <p className="font-display text-xl font-bold text-navy">{result.order_number}</p>
              </div>
              <span className="font-display text-lg font-bold text-navy">
                ₹{result.total_amount}
              </span>
            </div>
            <p className="deva mt-1 text-xs text-muted-foreground">
              {result.customer_name} · पिन {result.pincode} · {result.payment_method.toUpperCase()}
            </p>

            {cancelled ? (
              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4">
                <XCircle className="h-5 w-5 text-destructive" />
                <p className="deva text-sm text-destructive">ही ऑर्डर रद्द करण्यात आली आहे.</p>
              </div>
            ) : (
              <ol className="mt-6 space-y-0" data-testid="track-timeline">
                {FLOW.map((s, i) => {
                  const Icon = s.icon;
                  const done = currentIdx >= i;
                  const last = i === FLOW.length - 1;
                  return (
                    <li key={s.key} className="relative flex gap-4 pb-6 last:pb-0">
                      {!last && (
                        <span
                          className={`absolute left-5 top-11 h-[calc(100%-1.5rem)] w-px ${done && currentIdx > i ? "bg-accent" : "bg-border"}`}
                          aria-hidden
                        />
                      )}
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${done ? "border-gold bg-accent text-accent-foreground" : "border-border bg-ivory/90 text-muted-foreground"}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="pt-1">
                        <p
                          className={`deva font-medium ${done ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {s.title}
                        </p>
                        {currentIdx === i && (
                          <p className="deva text-xs text-accent">सध्याची स्थिती</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
