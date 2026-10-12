import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  Save,
  BarChart3,
  Truck,
  FileText,
  Smartphone,
  Plus,
  Trash2,
  Package,
} from "lucide-react";
import { UPI_ID_REGEX } from "@/lib/upi";
import { calcShipping, DEFAULT_SHIPPING, normalizeShipping } from "@/lib/shipping";
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
  const [colorEnabled, setColorEnabled] = useState(true);
  // Zones are edited as text ("416, 415") and turned into arrays when saving.
  type ZoneRow = { label: string; prefixes: string; fee: string };
  const [ship, setShip] = useState({
    enabled: DEFAULT_SHIPPING.enabled,
    flat_fee: "0",
    free_above: "0",
    cod_fee: "0",
    note: "",
  });
  const [zones, setZones] = useState<ZoneRow[]>([]);
  const [previewPin, setPreviewPin] = useState("416001");
  const [upi, setUpi] = useState({ enabled: false, upi_id: "", payee_name: "" });
  const upiIdInvalid = upi.upi_id.trim() !== "" && !UPI_ID_REGEX.test(upi.upi_id.trim());
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
          upi?: { enabled?: boolean; upi_id?: string; payee_name?: string };
          color_picker_enabled?: boolean;
          shipping?: unknown;
        }>("/api/admin/store-settings");
        setUpi({
          enabled: d.upi?.enabled === true,
          upi_id: d.upi?.upi_id ?? "",
          payee_name: d.upi?.payee_name ?? "",
        });
        setMarketing((p) => ({ ...p, ...d.marketing }));
        setCodEnabled(d.checkout?.cod_enabled !== false);
        setColorEnabled(d.color_picker_enabled !== false);
        const sh = normalizeShipping(d.shipping);
        setShip({
          enabled: sh.enabled,
          flat_fee: String(sh.flat_fee),
          free_above: String(sh.free_above),
          cod_fee: String(sh.cod_fee),
          note: sh.note,
        });
        setZones(
          sh.zones.map((z) => ({
            label: z.label,
            prefixes: z.prefixes.join(", "),
            fee: String(z.fee),
          })),
        );
        setInvoicing((p) => ({ ...p, ...d.invoicing }));
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Turns the typed shipping form into a validated payload (or an error message).
  const buildShipping = () => {
    const num = (v: string) => (v.trim() === "" ? 0 : Number(v));
    const flat = num(ship.flat_fee);
    const free = num(ship.free_above);
    const cod = num(ship.cod_fee);
    for (const [name, v] of [
      ["सामान्य डिलिव्हरी शुल्क", flat],
      ["मोफत डिलिव्हरीची मर्यादा", free],
      ["COD शुल्क", cod],
    ] as const) {
      if (!Number.isFinite(v) || v < 0) return `${name}: ० किंवा जास्त रक्कम टाका.`;
    }
    const zoneOut: { label: string; prefixes: string[]; fee: number }[] = [];
    for (const [i, z] of zones.entries()) {
      const prefixes = z.prefixes.split(/[\s,]+/).filter(Boolean);
      if (prefixes.length === 0 && !z.label.trim() && z.fee.trim() === "") continue;
      if (prefixes.length === 0 || prefixes.some((p) => !/^\d{1,6}$/.test(p))) {
        return `भाग ${i + 1}: पिनकोडची सुरुवात फक्त अंकांत टाका (उदा. 416, 415).`;
      }
      const fee = num(z.fee);
      if (!Number.isFinite(fee) || fee < 0) return `भाग ${i + 1}: शुल्क ० किंवा जास्त टाका.`;
      zoneOut.push({ label: z.label.trim(), prefixes, fee });
    }
    return {
      enabled: ship.enabled,
      flat_fee: flat,
      free_above: free,
      cod_fee: cod,
      note: ship.note.trim(),
      zones: zoneOut,
    };
  };

  const preview = (() => {
    const p = buildShipping();
    if (typeof p === "string") return null;
    const cfg = normalizeShipping(p);
    return {
      upi: calcShipping(cfg, 1100, previewPin, "upi"),
      cod: calcShipping(cfg, 1100, previewPin, "cod"),
    };
  })();

  const save = async () => {
    setMsg(null);
    if (upiIdInvalid || (upi.enabled && !UPI_ID_REGEX.test(upi.upi_id.trim()))) {
      setMsg("UPI ID बरोबर टाका (उदा. diamondhouse@okaxis) — मगच UPI सुरू करा.");
      return;
    }
    const shippingPayload = buildShipping();
    if (typeof shippingPayload === "string") {
      setMsg(shippingPayload);
      return;
    }
    setSaving(true);
    try {
      await adminFetch("/api/admin/store-settings", {
        method: "PUT",
        body: {
          color_picker_enabled: colorEnabled,
          shipping: shippingPayload,
          marketing,
          checkout: { cod_enabled: codEnabled },
          invoicing,
          upi: {
            enabled: upi.enabled,
            upi_id: upi.upi_id.trim(),
            payee_name: upi.payee_name.trim(),
          },
        },
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
            <label className="mt-5 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={colorEnabled}
                onChange={(e) => setColorEnabled(e.target.checked)}
                data-testid="cfg-color-enabled"
              />
              <span className="deva">
                शुभ रंग / नावाचे अक्षर निवडण्याची सुविधा सुरू ठेवा
                <span className="block text-xs text-muted-foreground">
                  बंद केल्यास मुख्य पान व चेकआऊटमधून ही सुविधा पूर्णपणे गायब होते आणि ऑर्डरसाठी
                  अक्षर लागत नाही.
                </span>
              </span>
            </label>
          </div>

          {/* Shipping charges */}
          <div className="surface-card p-6 lg:col-span-2" data-testid="integrations-shipping">
            <h2 className="flex items-center gap-2 text-lg text-foreground">
              <Package className="h-5 w-5 text-accent" /> डिलिव्हरी (शिपिंग) शुल्क
            </h2>
            <p className="deva mt-1 text-xs text-muted-foreground">
              बंद असेल तर डिलिव्हरी सर्वांसाठी मोफत. सुरू केल्यास चेकआऊटवर पिनकोडनुसार शुल्क आपोआप
              मोजले जाते, एकूण रकमेत जोडले जाते आणि UPI/कार्डमध्ये तीच रक्कम भरायला दिसते.
            </p>
            <label className="mt-4 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={ship.enabled}
                onChange={(e) => setShip({ ...ship, enabled: e.target.checked })}
                data-testid="cfg-ship-enabled"
              />
              <span className="deva">डिलिव्हरी शुल्क आकारा</span>
            </label>

            {ship.enabled && (
              <div className="mt-5 space-y-5">
                <div className="grid gap-4 sm:grid-cols-3">
                  {field(
                    "सामान्य डिलिव्हरी शुल्क (₹)",
                    ship.flat_fee,
                    (v) => setShip({ ...ship, flat_fee: v }),
                    "cfg-ship-flat",
                    "उदा. 80",
                  )}
                  {field(
                    "इतक्या खरेदीवर डिलिव्हरी मोफत (₹, 0 = कधीच नाही)",
                    ship.free_above,
                    (v) => setShip({ ...ship, free_above: v }),
                    "cfg-ship-free",
                    "उदा. 2000",
                  )}
                  {field(
                    "COD हाताळणी शुल्क (₹, ऐच्छिक)",
                    ship.cod_fee,
                    (v) => setShip({ ...ship, cod_fee: v }),
                    "cfg-ship-cod",
                    "उदा. 30",
                  )}
                </div>

                <div>
                  <p className="deva text-sm font-medium text-foreground">
                    भागानुसार वेगळे शुल्क (ऐच्छिक)
                  </p>
                  <p className="deva text-xs text-muted-foreground">
                    पिनकोडची सुरुवात टाका (उदा. कोल्हापूरसाठी 416, 415). जो भाग जुळेल त्याचे शुल्क
                    लागेल; कुठलाच जुळला नाही तर वरचे सामान्य शुल्क.
                  </p>
                  <div className="mt-3 space-y-2" data-testid="ship-zones">
                    {zones.map((z, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1.4fr_90px_36px] gap-2">
                        <input
                          className={inputCls}
                          placeholder="नाव (उदा. कोल्हापूर)"
                          value={z.label}
                          onChange={(e) =>
                            setZones(
                              zones.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)),
                            )
                          }
                        />
                        <input
                          className={inputCls}
                          placeholder="पिनकोड सुरुवात: 416, 415"
                          value={z.prefixes}
                          onChange={(e) =>
                            setZones(
                              zones.map((r, j) =>
                                j === i ? { ...r, prefixes: e.target.value } : r,
                              ),
                            )
                          }
                        />
                        <input
                          className={inputCls}
                          placeholder="₹"
                          inputMode="decimal"
                          value={z.fee}
                          onChange={(e) =>
                            setZones(
                              zones.map((r, j) => (j === i ? { ...r, fee: e.target.value } : r)),
                            )
                          }
                        />
                        <button
                          type="button"
                          aria-label="भाग काढा"
                          onClick={() => setZones(zones.filter((_, j) => j !== i))}
                          className="mt-1 flex h-10 items-center justify-center rounded-xl border border-border text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  {zones.length < 20 && (
                    <button
                      type="button"
                      onClick={() => setZones([...zones, { label: "", prefixes: "", fee: "" }])}
                      className="deva mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs"
                      data-testid="ship-add-zone"
                    >
                      <Plus className="h-3.5 w-3.5" /> भाग जोडा
                    </button>
                  )}
                </div>

                {field(
                  "ग्राहकाला दाखवायची छोटी सूचना (ऐच्छिक)",
                  ship.note,
                  (v) => setShip({ ...ship, note: v }),
                  "cfg-ship-note",
                  "उदा. डिलिव्हरी ३–५ दिवसांत",
                )}

                {preview && (
                  <div
                    className="rounded-xl border border-border bg-secondary/40 p-4 text-sm"
                    data-testid="ship-preview"
                  >
                    <p className="deva text-xs text-muted-foreground">
                      तपासून पहा — ₹1100 च्या ऑर्डरसाठी या पिनकोडवर:
                    </p>
                    <input
                      className={`${inputCls} max-w-[160px]`}
                      value={previewPin}
                      maxLength={6}
                      inputMode="numeric"
                      onChange={(e) => setPreviewPin(e.target.value.replace(/\D/g, ""))}
                    />
                    <p className="deva mt-2 text-foreground">
                      UPI/Online: डिलिव्हरी ₹{preview.upi.shipping} →{" "}
                      <b>एकूण ₹{preview.upi.total}</b>
                    </p>
                    <p className="deva text-foreground">
                      COD: डिलिव्हरी ₹{preview.cod.shipping} + COD शुल्क ₹{preview.cod.cod_fee} →{" "}
                      <b>एकूण ₹{preview.cod.total}</b>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direct UPI payments */}
          <div className="surface-card p-6 lg:col-span-2" data-testid="integrations-upi">
            <h2 className="flex items-center gap-2 text-lg text-foreground">
              <Smartphone className="h-5 w-5 text-accent" /> UPI Payment (no gateway)
            </h2>
            <p className="deva mt-1 text-xs text-muted-foreground">
              ग्राहक थेट या UPI ID वर पैसे भरतो आणि स्क्रीनशॉट अपलोड करतो. पैसे थेट तुमच्या बँक
              खात्यात येतात — कोणतीही फी नाही. Orders मध्ये बँक तपासून “पेमेंट मिळाले” दाबा.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm text-foreground">UPI ID (VPA)</label>
                <input
                  className={inputCls}
                  value={upi.upi_id}
                  placeholder="e.g. diamondhouse@okaxis"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  onChange={(e) => setUpi({ ...upi, upi_id: e.target.value })}
                  data-testid="cfg-upi-id"
                />
                {upiIdInvalid && (
                  <p className="mt-1 text-xs text-destructive">
                    Invalid UPI ID — format: name@bank
                  </p>
                )}
              </div>
              {field(
                "Payee name (as shown in UPI apps)",
                upi.payee_name,
                (v) => setUpi({ ...upi, payee_name: v }),
                "cfg-upi-name",
                "Diamond House",
              )}
            </div>
            <label className="mt-5 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={upi.enabled}
                onChange={(e) => setUpi({ ...upi, enabled: e.target.checked })}
                data-testid="cfg-upi-enabled"
              />
              <span className="deva">Checkout वर UPI पेमेंट सुरू करा</span>
            </label>
            <p className="deva mt-3 rounded-xl bg-secondary/60 px-4 py-2.5 text-xs text-muted-foreground">
              टीप: व्यवसायाचे पेमेंट्स शक्यतो current account / business UPI वर घ्या. सेव्ह केल्यावर
              स्वतः एक टेस्ट ऑर्डर करून QR, पेमेंट व स्क्रीनशॉट अपलोड तपासा.
            </p>
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
            <span
              className={`deva text-sm ${msg.includes("✅") ? "text-[var(--whatsapp)]" : "text-destructive"}`}
              data-testid="settings-msg"
            >
              {msg}
            </span>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
