import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MessageCircle, Phone } from "lucide-react";
import { GoldSwash } from "@/components/GoldSwash";

export const Route = createFileRoute("/order-confirmation")({
  head: () => ({ meta: [{ title: "धन्यवाद! ऑर्डर नोंदवली | Diamond House" }] }),
  validateSearch: (search: Record<string, unknown>): { order?: string } => ({
    order: typeof search.order === "string" ? search.order : undefined,
  }),
  component: OrderConfirmation,
});

function OrderConfirmation() {
  const { order } = Route.useSearch();
  const waText = encodeURIComponent(
    `नमस्कार Diamond House, माझी ऑर्डर क्रमांक ${order ?? ""} बद्दल माहिती हवी आहे.`,
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-x-hidden px-5 py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-glow)", opacity: 0.4 }}
      />
      <div className="surface-card w-full max-w-lg p-8 text-center md:p-10" data-testid="confirmation-card">
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
            <p className="font-display text-2xl font-bold text-navy" data-testid="confirmation-order-number">
              {order}
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          <a
            href={`https://wa.me/919657130131?text=${waText}`}
            target="_blank"
            rel="noreferrer"
            data-testid="whatsapp-support"
            className="deva inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[var(--whatsapp)] px-6 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp वर संपर्क करा
          </a>
          <a
            href="tel:+919657130131"
            className="deva inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-border px-6 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Phone className="h-4 w-4" /> 96 57 130 131
          </a>
          <Link
            to="/"
            className="deva mt-2 text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            मुख्य पानावर परत जा
          </Link>
        </div>
      </div>
    </main>
  );
}
