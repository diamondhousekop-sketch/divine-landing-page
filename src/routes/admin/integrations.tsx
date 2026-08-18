import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Save, BarChart3, Truck, FileText } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { adminFetch } from "@/lib/admin-api";

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({ meta: [{ title: "Integrations & Settings | Diamond House Admin" }] }),
  component: IntegrationsPage,
});

type Marketing = {
  meta_pixel_id: string;
  ga4_id: string;
  gtm_id: string;
  gsc_verification: string;
};
type Invoicing = {
  prefix: string;
  business_name: string;
  business_address: string;
  business_phone: string;
  business_email: string;
  gstin: string;
  product_label: string;
};

function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [marketing, setMarketing] = useState<Marketing>({
    meta_pixel_id: "",
    ga4_id: "",
    gtm_id: "",
    gsc_verification: "",
  });
  const [codEnabled, setCodEnabled] = useState(true);
  const [invoicing, setInvoicing] = useState<Invoicing>({
    prefix: "DH",
    business_name: "Diamond House",
    business_address: "",
    business_phone: "",
    business_email: "",
    gstin: "",
    product_label: "Icchapurti Lucky Stone (Blessed)",
  });

  useEffect(() => {
    (async () => {
      try {
        const d = await adminFetch<{
          marketing: Partial<Marketing>;
          checkout: { cod_enabled?: boolean };
          invoicing: Partial<Invoicing>;
        }>("/api/admin/store-settings");
        setMarketing((p) => ({ ...p, ...d.marketing }));
        setCodEnabled(d.checkout?.cod_enabled !== false);
        setInvoicing((p) => ({ ...p, ...d.invoicing }));
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await adminFetch("/api/admin/store-settings", {
        method: "PUT",
        body: { marketing, checkout: { cod_enabled: codEnabled }, invoicing },
      });
      setMsg("जतन झाले! ✅");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40";
  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    testid: string,
    placeholder = "",
  ) => (
    <div>
      <label className="text-sm text-foreground">{label}</label>
      <input
        className={inputCls}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testid}
      />
    </div>
  );

  return (
    <AdminLayout title="इंटिग्रेशन्स व सेटिंग्ज">
      {loading ? (
        <p className="deva text-sm text-muted-foreground">लोड होत आहे…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Marketing / Analytics */}
          <div className="surface-card p-6" data-testid="integrations-marketing">
            <h2 className="flex items-center gap-2 text-lg text-foreground">
              <BarChart3 className="h-5 w-5 text-accent" /> Marketing & Analytics
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Public IDs. Injected site-wide only when set. Leave blank to disable.
            </p>
            <div className="mt-5 space-y-4">
              {field(
                "Meta Pixel ID",
                marketing.meta_pixel_id,
                (v) => setMarketing({ ...marketing, meta_pixel_id: v }),
                "cfg-meta-pixel",
                "e.g. 123456789012345",
              )}
              {field(
                "Google Analytics 4 Measurement ID",
                marketing.ga4_id,
                (v) => setMarketing({ ...marketing, ga4_id: v }),
                "cfg-ga4",
                "e.g. G-XXXXXXXXXX",
              )}
              {field(
                "Google Tag Manager ID (optional)",
                marketing.gtm_id,
                (v) => setMarketing({ ...marketing, gtm_id: v }),
                "cfg-gtm",
                "e.g. GTM-XXXXXX",
              )}
              {field(
                "Google Search Console verification",
                marketing.gsc_verification,
                (v) => setMarketing({ ...marketing, gsc_verification: v }),
                "cfg-gsc",
                "content of the google-site-verification meta tag",
              )}
            </div>
          </div>

          {/* Checkout / COD */}
          <div className="surface-card p-6" data-testid="integrations-checkout">
            <h2 className="flex items-center gap-2 text-lg text-foreground">
              <Truck className="h-5 w-5 text-accent" /> Checkout
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Cash on Delivery is ON by default. Turn it off only if you want to accept online
              payments only.
            </p>
            <label className="mt-5 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={codEnabled}
                onChange={(e) => setCodEnabled(e.target.checked)}
                data-testid="cfg-cod-enabled"
              />
              <span className="deva">Cash on Delivery (COD) सुरू ठेवा</span>
            </label>
            {!codEnabled && (
              <p className="mt-3 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
                COD बंद आहे — ग्राहक फक्त ऑनलाईन पेमेंट करू शकतील. ऑनलाईन पेमेंट सुरू असल्याची
                खात्री करा (Content → Payments).
              </p>
            )}
          </div>

          {/* Business / Invoice */}
          <div className="surface-card p-6 lg:col-span-2" data-testid="integrations-invoicing">
            <h2 className="flex items-center gap-2 text-lg text-foreground">
              <FileText className="h-5 w-5 text-accent" /> Business & Invoice
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown on the branded PDF invoice. GST is optional — leave blank if you don't have one.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {field(
                "Invoice number prefix",
                invoicing.prefix,
                (v) => setInvoicing({ ...invoicing, prefix: v }),
                "cfg-inv-prefix",
                "DH",
              )}
              {field(
                "Business name",
                invoicing.business_name,
                (v) => setInvoicing({ ...invoicing, business_name: v }),
                "cfg-inv-name",
              )}
              <div className="sm:col-span-2">
                <label className="text-sm text-foreground">Business address (English)</label>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={invoicing.business_address}
                  onChange={(e) => setInvoicing({ ...invoicing, business_address: e.target.value })}
                  data-testid="cfg-inv-address"
                />
              </div>
              {field(
                "Phone",
                invoicing.business_phone,
                (v) => setInvoicing({ ...invoicing, business_phone: v }),
                "cfg-inv-phone",
              )}
              {field(
                "Business email (optional)",
                invoicing.business_email,
                (v) => setInvoicing({ ...invoicing, business_email: v }),
                "cfg-inv-email",
              )}
              {field(
                "GSTIN (optional)",
                invoicing.gstin,
                (v) => setInvoicing({ ...invoicing, gstin: v }),
                "cfg-inv-gstin",
              )}
              {field(
                "Product label on invoice (English)",
                invoicing.product_label,
                (v) => setInvoicing({ ...invoicing, product_label: v }),
                "cfg-inv-product",
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && (
        <div className="mt-6 flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-2.5 text-sm font-semibold text-gold-light disabled:opacity-70"
            data-testid="settings-save"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
            जतन करा
          </button>
          {msg && (
            <span className="deva text-sm text-[var(--whatsapp)]" data-testid="settings-msg">
              {msg}
            </span>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
