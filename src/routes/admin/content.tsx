import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, CreditCard } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/content")({
  head: () => ({ meta: [{ title: "Content & Payments | Diamond House Admin" }] }),
  component: ContentPage,
});

const FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "hero_badge", label: "हिरो बॅज (वरील छोटा मजकूर)" },
  { key: "hero_headline", label: "हिरो मुख्य शीर्षक" },
  { key: "hero_subheadline", label: "हिरो उप-शीर्षक (English)", multiline: true },
  { key: "announcement", label: "घोषणा पट्टी (announcement bar)", multiline: true },
  { key: "founder_video_url", label: "Founder Thank-You व्हिडिओ URL (YouTube / Vimeo / MP4) — पेमेंट यशस्वी पानावर दिसेल" },
];

function ContentPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Razorpay
  const [rzp, setRzp] = useState({ key_id: "", key_secret: "", webhook_secret: "", enabled: false });
  const [rzpInfo, setRzpInfo] = useState<{ has_key_secret: boolean; has_webhook_secret: boolean }>({ has_key_secret: false, has_webhook_secret: false });
  const [savingRzp, setSavingRzp] = useState(false);
  const [rzpMsg, setRzpMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const d = await adminFetch<{ content: { key: string; value: unknown }[] }>("/api/admin/content");
        const v: Record<string, string> = {};
        for (const row of d.content) {
          v[row.key] = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
        }
        setValues(v);
        const s = await adminFetch<{ razorpay: { key_id: string; enabled: boolean; has_key_secret: boolean; has_webhook_secret: boolean } }>("/api/admin/settings");
        setRzp((prev) => ({ ...prev, key_id: s.razorpay.key_id, enabled: s.razorpay.enabled }));
        setRzpInfo({ has_key_secret: s.razorpay.has_key_secret, has_webhook_secret: s.razorpay.has_webhook_secret });
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveContent = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const entries = FIELDS.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
      await adminFetch("/api/admin/content", { method: "PUT", body: { entries } });
      setMsg("जतन झाले! ✅ (लँडिंग पेज रिफ्रेश करा)");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveRzp = async () => {
    setSavingRzp(true);
    setRzpMsg(null);
    try {
      await adminFetch("/api/admin/settings", {
        method: "PUT",
        body: {
          key_id: rzp.key_id,
          key_secret: rzp.key_secret || undefined,
          webhook_secret: rzp.webhook_secret || undefined,
          enabled: rzp.enabled,
        },
      });
      setRzp((p) => ({ ...p, key_secret: "", webhook_secret: "" }));
      setRzpMsg("Razorpay सेटिंग्ज जतन झाल्या! ✅");
    } catch (e) {
      setRzpMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingRzp(false);
    }
  };

  const inputCls = "mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <AdminLayout title="कंटेंट व पेमेंट">
      {loading ? (
        <p className="deva text-sm text-muted-foreground">लोड होत आहे…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Content */}
          <div className="surface-card p-6" data-testid="content-form">
            <h2 className="deva text-lg text-foreground">वेबसाईट मजकूर</h2>
            <p className="deva mt-1 text-xs text-muted-foreground">हे बदल लँडिंग पेजवर लगेच दिसतील.</p>
            <div className="mt-5 space-y-4">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="deva text-sm text-foreground">{f.label}</label>
                  {f.multiline ? (
                    <textarea rows={2} className={inputCls} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} data-testid={`content-${f.key}`} />
                  ) : (
                    <input className={inputCls} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} data-testid={`content-${f.key}`} />
                  )}
                </div>
              ))}
            </div>
            {msg && <p className="deva mt-4 text-sm text-[var(--whatsapp)]" data-testid="content-msg">{msg}</p>}
            <button onClick={saveContent} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-gold-light disabled:opacity-70" data-testid="content-save">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} जतन करा
            </button>
          </div>

          {/* Razorpay */}
          <div className="surface-card p-6" data-testid="payment-form">
            <h2 className="deva flex items-center gap-2 text-lg text-foreground">
              <CreditCard className="h-5 w-5 text-accent" /> Razorpay पेमेंट सेटिंग्ज
            </h2>
            <p className="deva mt-1 text-xs text-muted-foreground">
              Razorpay Dashboard मधून keys घ्या. सिक्रेट सुरक्षितपणे सेव्ह होतात (परत दाखवले जात नाहीत).
            </p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="text-sm text-foreground">Key ID (rzp_live_… / rzp_test_…)</label>
                <input className={inputCls} value={rzp.key_id} onChange={(e) => setRzp({ ...rzp, key_id: e.target.value })} data-testid="rzp-key-id" placeholder="rzp_test_xxxxxxxx" />
              </div>
              <div>
                <label className="text-sm text-foreground">Key Secret {rzpInfo.has_key_secret && <span className="text-[var(--whatsapp)]">(सेट आहे ✓)</span>}</label>
                <input type="password" className={inputCls} value={rzp.key_secret} onChange={(e) => setRzp({ ...rzp, key_secret: e.target.value })} data-testid="rzp-key-secret" placeholder={rzpInfo.has_key_secret ? "•••••• (बदलण्यासाठी नवीन टाका)" : "key secret"} />
              </div>
              <div>
                <label className="text-sm text-foreground">Webhook Secret {rzpInfo.has_webhook_secret && <span className="text-[var(--whatsapp)]">(सेट आहे ✓)</span>}</label>
                <input type="password" className={inputCls} value={rzp.webhook_secret} onChange={(e) => setRzp({ ...rzp, webhook_secret: e.target.value })} data-testid="rzp-webhook-secret" placeholder={rzpInfo.has_webhook_secret ? "•••••• (बदलण्यासाठी नवीन टाका)" : "webhook secret"} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={rzp.enabled} onChange={(e) => setRzp({ ...rzp, enabled: e.target.checked })} data-testid="rzp-enabled" />
                <span className="deva">ऑनलाईन पेमेंट सुरू करा</span>
              </label>
            </div>
            {rzpMsg && <p className="deva mt-4 text-sm text-[var(--whatsapp)]" data-testid="rzp-msg">{rzpMsg}</p>}
            <button onClick={saveRzp} disabled={savingRzp} className="mt-5 inline-flex items-center gap-2 rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-gold-light disabled:opacity-70" data-testid="rzp-save">
              {savingRzp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} जतन करा
            </button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
