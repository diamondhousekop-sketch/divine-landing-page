import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { adminFetch } from "@/lib/admin-api";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({
  head: () => ({ meta: [{ title: "Products | Diamond House Admin" }] }),
  component: ProductsPage,
});

type Draft = {
  id?: string;
  name: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  is_active: boolean;
  images: string[];
  video_url: string;
};

const empty: Draft = {
  name: "",
  description: "",
  price: 0,
  compare_at_price: null,
  stock_quantity: 0,
  is_active: true,
  images: [],
  video_url: "",
};

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminFetch<{ products: Product[] }>("/api/admin/products");
      setProducts(d.products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const body = {
        name: draft.name,
        description: draft.description || "",
        price: Number(draft.price),
        compare_at_price: draft.compare_at_price === null ? null : Number(draft.compare_at_price),
        stock_quantity: Number(draft.stock_quantity),
        is_active: draft.is_active,
        images: draft.images,
        video_url: draft.video_url || "",
      };
      if (draft.id) {
        await adminFetch("/api/admin/products", {
          method: "PATCH",
          body: { id: draft.id, ...body },
        });
      } else {
        await adminFetch("/api/admin/products", { method: "POST", body });
      }
      setDraft(null);
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("हे प्रॉडक्ट डिलीट करायचे?")) return;
    try {
      await adminFetch("/api/admin/products", { method: "DELETE", params: { id } });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <AdminLayout title="प्रॉडक्ट्स">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setDraft({ ...empty })}
          data-testid="product-add-button"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-gold-light hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> नवीन प्रॉडक्ट
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && <p className="deva text-sm text-muted-foreground">लोड होत आहे…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="products-grid">
        {products.map((p) => (
          <div key={p.id} className="surface-card p-5" data-testid={`product-${p.id}`}>
            <div className="flex items-start justify-between">
              <h3 className="deva text-base font-medium text-foreground">{p.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${p.is_active ? "bg-[color-mix(in_oklab,var(--whatsapp)_18%,transparent)] text-[var(--whatsapp)]" : "bg-secondary text-muted-foreground"}`}
              >
                {p.is_active ? "Active" : "Hidden"}
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-navy">
              ₹{Number(p.price)}
              {p.compare_at_price ? (
                <span className="ml-2 text-sm text-muted-foreground line-through">
                  ₹{Number(p.compare_at_price)}
                </span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">स्टॉक: {p.stock_quantity}</p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  setDraft({
                    id: p.id,
                    name: p.name,
                    description: p.description ?? "",
                    price: Number(p.price),
                    compare_at_price:
                      p.compare_at_price === null ? null : Number(p.compare_at_price),
                    stock_quantity: p.stock_quantity,
                    is_active: p.is_active,
                    images: p.images ?? [],
                    video_url: p.video_url ?? "",
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                data-testid={`product-edit-${p.id}`}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => remove(p.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                data-testid={`product-delete-${p.id}`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          data-testid="product-modal"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setDraft(null)} />
          <div className="surface-card relative z-10 w-full max-w-lg p-6">
            <h2 className="deva text-xl text-foreground">
              {draft.id ? "प्रॉडक्ट संपादित करा" : "नवीन प्रॉडक्ट"}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="deva text-sm">नाव</label>
                <input
                  className={inputCls}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  data-testid="product-name"
                />
              </div>
              <div>
                <label className="deva text-sm">वर्णन</label>
                <textarea
                  rows={2}
                  className={inputCls}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  data-testid="product-description"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="deva text-sm">किंमत ₹</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                    data-testid="product-price"
                  />
                </div>
                <div>
                  <label className="deva text-sm">छापील किंमत ₹</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.compare_at_price ?? ""}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        compare_at_price: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    data-testid="product-compare"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 items-end gap-3">
                <div>
                  <label className="deva text-sm">स्टॉक</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.stock_quantity}
                    onChange={(e) => setDraft({ ...draft, stock_quantity: Number(e.target.value) })}
                    data-testid="product-stock"
                  />
                </div>
                <label className="flex items-center gap-2 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                    data-testid="product-active"
                  />
                  <span className="deva">वेबसाईटवर दाखवा</span>
                </label>
              </div>

              <div>
                <label className="deva text-sm">
                  प्रॉडक्ट फोटो (स्लायडरसाठी — एकापेक्षा जास्त)
                </label>
                <div className="mt-2 flex flex-wrap gap-3">
                  {draft.images.map((url, i) => (
                    <div key={i} className="relative">
                      <img
                        src={url}
                        alt=""
                        className="h-20 w-20 rounded-xl border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })
                        }
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white"
                        aria-label="काढा"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <ImageUploader
                    value=""
                    onChange={(url) =>
                      url && setDraft({ ...draft, images: [...draft.images, url] })
                    }
                    folder="products"
                    testId="product-image-add"
                  />
                </div>
              </div>

              <div>
                <label className="deva text-sm">
                  प्रॉडक्ट व्हिडिओ URL (Vimeo — स्लायडरच्या शेवटी दिसेल)
                </label>
                <input
                  className={inputCls}
                  value={draft.video_url}
                  onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
                  placeholder="https://vimeo.com/123456789"
                  data-testid="product-video-url"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDraft(null)}
                className="rounded-full border border-border px-5 py-2 text-sm hover:bg-secondary"
              >
                रद्द करा
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-navy px-6 py-2 text-sm font-semibold text-gold-light disabled:opacity-70"
                data-testid="product-save"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />} जतन करा
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
