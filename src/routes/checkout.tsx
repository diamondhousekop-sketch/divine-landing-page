import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ShieldCheck, Truck, Phone } from "lucide-react";
import { getActiveProduct } from "@/lib/queries";
import { publicPost } from "@/lib/admin-api";
import { track } from "@/lib/analytics";
import { GoldSwash } from "@/components/GoldSwash";
import { ColorLetterPicker } from "@/components/ColorLetterPicker";
import { groupForLetter } from "@/lib/rashi";

const schema = z.object({
  customer_name: z.string().trim().min(2, "पूर्ण नाव टाका"),
  customer_phone: z
    .string()
    .trim()
    .regex(/^(\+91[\s-]?)?[6-9]\d{9}$/, "10 अंकी मोबाईल नंबर टाका"),
  customer_email: z.string().trim().email("योग्य ईमेल टाका").optional().or(z.literal("")),
  customer_address: z.string().trim().min(6, "संपूर्ण पत्ता टाका"),
  customer_pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "6 अंकी पिनकोड टाका"),
  quantity: z.coerce.number().int().min(1).max(10),
  payment_method: z.enum(["cod", "online"]),
  color_letter: z.string().trim().min(1, "कृपया तुमच्या नावाचे अक्षर निवडा"),
});
type FormValues = z.input<typeof schema>;

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "ऑर्डर करा | Diamond House" }] }),
  validateSearch: (s: Record<string, unknown>): { letter?: string } =>
    typeof s["letter"] === "string" ? { letter: s["letter"] } : {},
  loaderDeps: ({ search }) => ({ letter: search.letter }),
  loader: async ({ deps }) => ({ product: await getActiveProduct(), letter: deps.letter ?? "" }),
  component: Checkout,
});

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Razorpay?: unknown }).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function Checkout() {
  const { product, letter: initialLetter } = Route.useLoaderData();
  const navigate = useNavigate();
  const [onlineEnabled, setOnlineEnabled] = useState(false);
  const [codEnabled, setCodEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: 1, payment_method: "cod", color_letter: initialLetter },
  });

  const colorLetter = watch("color_letter") || "";

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        setOnlineEnabled(!!d.online_enabled);
        const cod = d.cod_enabled !== false;
        setCodEnabled(cod);
        // If the owner turned COD off, default to online payment.
        if (!cod && d.online_enabled) setValue("payment_method", "online");
      })
      .catch(() => {
        setOnlineEnabled(false);
        setCodEnabled(true);
      });
  }, [setValue]);

  const qty = Number(watch("quantity") || 1);
  const total = product.price * qty;

  // Fire InitiateCheckout / begin_checkout once when the checkout loads.
  useEffect(() => {
    track("InitiateCheckout", "begin_checkout", {
      currency: "INR",
      value: product.price,
      content_name: product.name,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        quantity: Number(values.quantity),
        customer_email: values.customer_email || undefined,
        product_id: product.id || undefined,
        color_group: groupForLetter(values.color_letter)?.id,
      };
      const { order } = await publicPost<{
        order: { id: string; order_number: string; total_amount: number; payment_method: string };
      }>("/api/orders", payload);

      if (values.payment_method === "cod") {
        navigate({
          to: "/order-confirmation",
          search: { order: order.order_number, amt: order.total_amount, m: "cod" },
        });
        return;
      }

      // Online payment via Razorpay
      const init = await publicPost<{
        razorpay_order_id: string;
        amount: number;
        currency: string;
        key_id: string;
      }>("/api/payment/create", { order_id: order.id });

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("पेमेंट विंडो लोड होऊ शकली नाही. पुन्हा प्रयत्न करा.");

      const RazorpayCtor = (
        window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }
      ).Razorpay;
      const rzp = new RazorpayCtor({
        key: init.key_id,
        amount: init.amount,
        currency: init.currency,
        order_id: init.razorpay_order_id,
        name: "Diamond House",
        description: product.name,
        prefill: {
          name: values.customer_name,
          contact: values.customer_phone,
          email: values.customer_email || undefined,
        },
        theme: { color: "#6E1423" },
        handler: async (resp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await publicPost("/api/payment/verify", { order_id: order.id, ...resp });
            navigate({
              to: "/order-confirmation",
              search: { order: order.order_number, amt: order.total_amount, m: "online" },
            });
          } catch {
            setServerError("पेमेंट पडताळणी अयशस्वी. कृपया संपर्क करा — 96 57 130 131.");
            setSubmitting(false);
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      });
      rzp.open();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "काहीतरी चूक झाली. पुन्हा प्रयत्न करा.");
      setSubmitting(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-ring/40";

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="deva text-sm text-muted-foreground hover:text-primary">
          ← मुख्य पानावर परत
        </Link>

        <div className="mt-4 text-center">
          <h1 className="deva text-3xl font-normal text-primary md:text-4xl">
            तुमची ऑर्डर पूर्ण करा
          </h1>
          <GoldSwash className="mx-auto mt-3 w-40" />
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* FORM */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="surface-card p-6 md:p-8"
            data-testid="checkout-form"
          >
            <h2 className="deva text-xl text-foreground">तुमचा शुभ रंग</h2>
            <div className="surface-card mt-4 p-5">
              <ColorLetterPicker
                letter={colorLetter}
                onChange={(l) => setValue("color_letter", l, { shouldValidate: true })}
                required
                {...(errors.color_letter?.message ? { error: errors.color_letter.message } : {})}
              />
            </div>

            <h2 className="deva mt-8 text-xl text-foreground">ग्राहक माहिती</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="deva text-sm text-foreground">पूर्ण नाव *</label>
                <input
                  className={inputCls}
                  data-testid="input-name"
                  {...register("customer_name")}
                />
                {errors.customer_name && (
                  <p className="deva mt-1 text-xs text-destructive">
                    {errors.customer_name.message}
                  </p>
                )}
              </div>
              <div>
                <label className="deva text-sm text-foreground">मोबाईल नंबर *</label>
                <input
                  className={inputCls}
                  data-testid="input-phone"
                  inputMode="numeric"
                  placeholder="9876543210"
                  {...register("customer_phone")}
                />
                {errors.customer_phone && (
                  <p className="deva mt-1 text-xs text-destructive">
                    {errors.customer_phone.message}
                  </p>
                )}
              </div>
              <div>
                <label className="deva text-sm text-foreground">ईमेल (ऐच्छिक)</label>
                <input
                  className={inputCls}
                  data-testid="input-email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("customer_email")}
                />
                {errors.customer_email && (
                  <p className="deva mt-1 text-xs text-destructive">
                    {errors.customer_email.message}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="deva text-sm text-foreground">संपूर्ण पत्ता *</label>
                <textarea
                  rows={3}
                  className={inputCls}
                  data-testid="input-address"
                  placeholder="घर क्र., गल्ली, गाव/शहर"
                  {...register("customer_address")}
                />
                {errors.customer_address && (
                  <p className="deva mt-1 text-xs text-destructive">
                    {errors.customer_address.message}
                  </p>
                )}
              </div>
              <div>
                <label className="deva text-sm text-foreground">पिनकोड *</label>
                <input
                  className={inputCls}
                  data-testid="input-pincode"
                  inputMode="numeric"
                  placeholder="416001"
                  {...register("customer_pincode")}
                />
                {errors.customer_pincode && (
                  <p className="deva mt-1 text-xs text-destructive">
                    {errors.customer_pincode.message}
                  </p>
                )}
              </div>
              <div>
                <label className="deva text-sm text-foreground">संख्या</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  className={inputCls}
                  data-testid="input-quantity"
                  {...register("quantity")}
                />
              </div>
            </div>

            <h2 className="deva mt-8 text-xl text-foreground">पेमेंट पद्धत</h2>
            <div className="mt-4 space-y-3">
              <label
                className={`surface-card flex items-center gap-3 px-4 py-3 ${codEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                <input
                  type="radio"
                  value="cod"
                  disabled={!codEnabled}
                  data-testid="payment-cod"
                  {...register("payment_method")}
                />
                <span className="deva text-sm text-foreground">
                  Cash on Delivery — घरपोच आल्यावर पैसे द्या 🚚
                  {!codEnabled && " (सध्या बंद)"}
                </span>
              </label>
              <label
                className={`surface-card flex items-center gap-3 px-4 py-3 ${onlineEnabled ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
              >
                <input
                  type="radio"
                  value="online"
                  disabled={!onlineEnabled}
                  data-testid="payment-online"
                  {...register("payment_method")}
                />
                <span className="deva text-sm text-foreground">
                  Online Payment (UPI / Card) {onlineEnabled ? "🔒" : "— लवकरच उपलब्ध"}
                </span>
              </label>
            </div>

            {serverError && (
              <p
                className="deva mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                data-testid="checkout-error"
              >
                {serverError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              data-testid="checkout-submit"
              className="shimmer cta-gold-pulse relative mt-6 inline-flex min-h-[54px] w-full items-center justify-center overflow-hidden rounded-full bg-navy px-8 text-base font-semibold tracking-wide text-gold-light transition-transform duration-200 hover:scale-[1.02] disabled:opacity-70"
            >
              <span className="deva relative z-10 flex items-center gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "प्रक्रिया सुरू आहे…" : `आत्ताच मागवा · ₹${total}`}
              </span>
            </button>
          </form>

          {/* SUMMARY */}
          <aside className="h-fit space-y-4">
            <div className="surface-card p-6" data-testid="order-summary">
              <h3 className="deva text-lg text-foreground">ऑर्डर सारांश</h3>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="deva text-muted-foreground">{product.name}</span>
                <span className="font-medium text-foreground">₹{product.price}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="deva text-muted-foreground">संख्या</span>
                <span className="text-foreground">× {qty}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="deva font-medium text-primary">एकूण रक्कम</span>
                <span
                  className="font-display text-2xl font-bold text-navy"
                  data-testid="summary-total"
                >
                  ₹{total}
                </span>
              </div>
            </div>
            <div className="surface-card space-y-3 p-6 text-sm">
              <p className="flex items-center gap-2 text-foreground">
                <ShieldCheck className="h-4 w-4 text-accent" />
                <span className="deva">१००% असली · अस्सलतेचे प्रमाणपत्र</span>
              </p>
              <p className="flex items-center gap-2 text-foreground">
                <Truck className="h-4 w-4 text-accent" />
                <span className="deva">सुरक्षित पॅकिंग · घरपोच डिलिव्हरी</span>
              </p>
              <a
                href="tel:+919657130131"
                className="flex items-center gap-2 text-[var(--whatsapp)]"
              >
                <Phone className="h-4 w-4" />
                <span className="deva">मदतीसाठी: 96 57 130 131</span>
              </a>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
