// Client-side marketing analytics. All identifiers are PUBLIC (Meta Pixel ID,
// GA4 Measurement ID, GTM container) and are fetched from the public /api/config
// endpoint, then injected conditionally. Everything is a safe no-op until the
// store owner sets the IDs in Admin → Integrations.

type MarketingCfg = {
  meta_pixel_id?: string;
  ga4_id?: string;
  gtm_id?: string;
  gsc_verification?: string;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    __dhAnalyticsLoaded?: boolean;
  }
}

let cfg: MarketingCfg = {};

function injectScript(src: string, before = false) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
  return s;
}

function initPixel(id: string) {
  // Dedup is already handled by the __dhAnalyticsLoaded guard in bootAnalytics().
  const w = window as unknown as Record<string, (...args: unknown[]) => void>;
  /* eslint-disable */
  (function (f: any, b: any, e: any, v: any) {
    if (f.fbq) return;
    const n: any = (f.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
    });
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  injectScript("https://connect.facebook.net/en_US/fbevents.js");
  w["fbq"]?.("init", id);
  w["fbq"]?.("track", "PageView");
}

function initGA4(id: string) {
  const w = window as unknown as Record<string, (...args: unknown[]) => void>;
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${id}`);
  window.dataLayer = window.dataLayer || [];
  w["gtag"] = function (...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  w["gtag"]("js", new Date());
  w["gtag"]("config", id);
}

function initGTM(id: string) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  injectScript(`https://www.googletagmanager.com/gtm.js?id=${id}`);
}

function injectGscMeta(content: string) {
  if (document.querySelector('meta[name="google-site-verification"]')) return;
  const m = document.createElement("meta");
  m.name = "google-site-verification";
  m.content = content;
  document.head.appendChild(m);
}

export async function bootAnalytics() {
  if (typeof window === "undefined" || window.__dhAnalyticsLoaded) return;
  window.__dhAnalyticsLoaded = true;
  try {
    const res = await fetch("/api/config");
    const d = await res.json();
    cfg = {
      meta_pixel_id: d.meta_pixel_id || "",
      ga4_id: d.ga4_id || "",
      gtm_id: d.gtm_id || "",
      gsc_verification: d.gsc_verification || "",
    };
  } catch {
    return;
  }
  if (cfg.gsc_verification) injectGscMeta(cfg.gsc_verification);
  if (cfg.gtm_id) initGTM(cfg.gtm_id);
  if (cfg.meta_pixel_id) initPixel(cfg.meta_pixel_id);
  if (cfg.ga4_id) initGA4(cfg.ga4_id);
}

export function pageview(path: string) {
  try {
    window.fbq?.("track", "PageView");
  } catch {
    /* noop */
  }
  try {
    if (cfg.ga4_id) window.gtag?.("event", "page_view", { page_path: path });
  } catch {
    /* noop */
  }
}

// Fires the matching Meta Pixel + GA4 events for a funnel step.
export function track(
  pixelEvent: "ViewContent" | "InitiateCheckout" | "Purchase",
  gaEvent: "view_item" | "begin_checkout" | "purchase",
  params: Record<string, unknown> = {},
) {
  try {
    window.fbq?.("track", pixelEvent, params);
  } catch {
    /* noop */
  }
  try {
    window.gtag?.("event", gaEvent, params);
  } catch {
    /* noop */
  }
}
