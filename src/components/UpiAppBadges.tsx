import { Landmark, Lock, ShieldCheck } from "lucide-react";
import { UPI_APPS, type UpiApp } from "@/lib/upi";

// Original (not brand-copied) app tile: navy glass square, gold monogram and the
// app's name underneath. Official logo files can be dropped in later via `logo`.
export function UpiAppTile({ app, compact = false }: { app: UpiApp; compact?: boolean }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1.5 text-center">
      <span
        className={`font-display relative flex items-center justify-center rounded-2xl font-bold text-gold-light shadow-sm ring-1 ring-gold/50 ${
          compact ? "h-10 w-10 text-sm" : "h-14 w-14 text-xl"
        }`}
        style={{
          background:
            "linear-gradient(145deg, var(--navy) 0%, color-mix(in oklab, var(--navy) 80%, black) 100%)",
        }}
        aria-hidden="true"
      >
        <span className="absolute inset-x-2 top-1 h-px bg-gold-light/40" />
        {app.mono}
      </span>
      <span
        className={`text-foreground ${compact ? "text-[10px] leading-tight" : "text-xs"} font-medium`}
      >
        {app.name}
      </span>
    </span>
  );
}

// Shown on the checkout form (above the customer details) when UPI is enabled.
export function UpiTrustStrip() {
  return (
    <div
      className="mb-8 rounded-2xl border border-gold/40 bg-secondary/50 p-4 md:p-5"
      data-testid="upi-trust-strip"
    >
      <p className="deva flex items-center gap-2 text-sm font-semibold text-foreground">
        <Landmark className="h-4 w-4 text-accent" />
        UPI ने थेट बँकेतून पेमेंट — GPay, PhonePe, Paytm किंवा कोणतेही ॲप
      </p>
      <div className="mt-3 grid grid-cols-5 gap-1">
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
