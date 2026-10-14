import { Landmark, Lock, ShieldCheck } from "lucide-react";
import { UPI_APPS, type UpiApp } from "@/lib/upi";
import { UPI_ICONS } from "@/lib/upi-icons";

// Real brand mark (open-source icon set) in the app's own colour on a white tile.
export function UpiAppTile({ app, compact = false }: { app: UpiApp; compact?: boolean }) {
  const icon = UPI_ICONS[app.id];
  return (
    <span className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <span
        className={`flex items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-border ${
          compact ? "h-12 w-12" : "h-14 w-14"
        }`}
        aria-hidden="true"
      >
        {icon ? (
          <svg
            viewBox="0 0 24 24"
            className={compact ? "h-8 w-8" : "h-9 w-9"}
            fill={icon.hex}
            role="img"
          >
            <path d={icon.path} />
          </svg>
        ) : (
          <span className="font-display text-lg font-bold text-navy">{app.name.slice(0, 1)}</span>
        )}
      </span>
      <span className="text-foreground text-[11px] font-medium leading-tight">{app.name}</span>
    </span>
  );
}

// Shown under the payment-method choice once UPI is selected (after the customer
// details), never above the form.
export function UpiTrustStrip() {
  return (
    <div
      className="mt-3 rounded-2xl border border-gold/40 bg-secondary/50 p-4 md:p-5"
      data-testid="upi-trust-strip"
    >
      <p className="deva flex items-center gap-2 text-sm font-semibold text-foreground">
        <Landmark className="h-4 w-4 text-accent" />
        UPI ने थेट बँकेतून पेमेंट — GPay, PhonePe, Paytm किंवा कोणतेही UPI ॲप
      </p>
      <div className="mt-3 grid max-w-xs grid-cols-3 gap-2">
        {UPI_APPS.map((a) => (
          <UpiAppTile key={a.id} app={a} compact />
        ))}
      </div>
      <ul className="deva mt-4 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
        <li className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--whatsapp)]" />
          तुमचा UPI PIN फक्त तुमच्या ॲपमध्येच टाकला जातो
        </li>
        <li className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[var(--whatsapp)]" />
          पैसे थेट दुकानाच्या बँक खात्यात — कार्ड माहिती नको
        </li>
      </ul>
      <p className="deva mt-3 text-xs text-foreground">
        ऑर्डर नोंदवल्यावर पुढच्या स्टेपमध्ये तुमच्या आवडत्या ॲपवर टॅप करा — रक्कम आणि UPI ID आपोआप
        भरलेली असेल.
      </p>
    </div>
  );
}
