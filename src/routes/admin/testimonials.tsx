import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Star } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { adminFetch } from "@/lib/admin-api";
import type { Testimonial } from "@/lib/types";

export const Route = createFileRoute("/admin/testimonials")({
  head: () => ({ meta: [{ title: "Testimonials | Diamond House Admin" }] }),
  component: TestimonialsPage,
});

type Draft = {
  id?: string;
  customer_name: string;
  customer_city: string;
  quote: string;
  vimeo_url: string;
  customer_photo_url: string;
  rating: number;
  display_order: number;
  is_active: boolean;
};

const empty: Draft = {
  customer_name: "",
  customer_city: "",
  quote: "",
  vimeo_url: "",
  customer_photo_url: "",
  rating: 5,
  display_order: 0,
  is_active: true,
};

function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await adminFetch<{ testimonials: Testimonial[] }>("/api/admin/testimonials");
      setItems(d.testimonials);
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
        customer_name: draft.customer_name,
        customer_city: draft.customer_city || "",
        quote: draft.quote,
        vimeo_url: draft.vimeo_url || "",
        customer_photo_url: draft.customer_photo_url || "",
        rating: Number(draft.rating),
        display_order: Number(draft.display_order),
        is_active: draft.is_active,
      };
      if (draft.id) {
        await adminFetch("/api/admin/testimonials", {
          method: "PATCH",
          body: { id: draft.id, ...body },
        });
      } else {
        await adminFetch("/api/admin/testimonials", { method: "POST", body });
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
    if (!confirm("हा अनुभव डिलीट करायचा?")) return;
    try {
      await adminFetch("/api/admin/testimonials", { method: "DELETE", params: { id } });
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const inputCls =
    "mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/40";

  return (
    <AdminLayout title="ग्राहकांचे अनुभव">
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setDraft({ ...empty })}
          data-testid="testimonial-add-button"
          className="inline-flex items-center gap-2 rounded-full bg-navy px-5 py-2.5 text-sm font-semibold text-gold-light hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" /> नवीन अनुभव
        </button>
      </div>

      {error && (
        <p className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {loading && <p className="deva text-sm text-muted-foreground">लोड होत आहे…</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="testimonials-grid">
        {items.map((t) => (
          <div key={t.id} className="surface-card p-5" data-testid={`testimonial-${t.id}`}>
            <div className="flex items-center justify-between">
              <div className="flex text-accent">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${t.is_active ? "bg-[color-mix(in_oklab,var(--whatsapp)_18%,transparent)] text-[var(--whatsapp)]" : "bg-secondary text-muted-foreground"}`}
              >
                {t.is_active ? "Active" : "Hidden"}
              </span>
            </div>
            <p className="deva mt-3 text-sm text-foreground">“{t.quote}”</p>
            <p className="deva mt-2 text-xs text-muted-foreground">
              {t.customer_name}
              {t.customer_city ? `, ${t.customer_city}` : ""} · क्रम {t.display_order}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() =>
                  setDraft({
                    id: t.id,
                    customer_name: t.customer_name,
                    customer_city: t.customer_city ?? "",
                    quote: t.quote,
                    vimeo_url: t.vimeo_url ?? "",
                    customer_photo_url: t.customer_photo_url ?? "",
                    rating: t.rating,
                    display_order: t.display_order,
                    is_active: t.is_active,
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"
                data-testid={`testimonial-edit-${t.id}`}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                onClick={() => remove(t.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                data-testid={`testimonial-delete-${t.id}`}
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
          data-testid="testimonial-modal"
        >
          <div className="absolute inset-0 bg-black/50" onClick={() => setDraft(null)} />
          <div className="surface-card relative z-10 w-full max-w-lg p-6">
            <h2 className="deva text-xl text-foreground">
              {draft.id ? "अनुभव संपादित करा" : "नवीन अनुभव"}
            </h2>
            <div className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="deva text-sm">ग्राहक नाव</label>
                  <input
                    className={inputCls}
                    value={draft.customer_name}
                    onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })}
                    data-testid="testimonial-name"
                  />
                </div>
                <div>
                  <label className="deva text-sm">गाव / शहर</label>
                  <input
                    className={inputCls}
                    value={draft.customer_city}
                    onChange={(e) => setDraft({ ...draft, customer_city: e.target.value })}
                    data-testid="testimonial-city"
                  />
                </div>
              </div>
              <div>
                <label className="deva text-sm">अनुभव (quote)</label>
                <textarea
                  rows={3}
                  className={inputCls}
                  value={draft.quote}
                  onChange={(e) => setDraft({ ...draft, quote: e.target.value })}
                  data-testid="testimonial-quote"
                />
              </div>
              <div>
                <label className="deva text-sm">ग्राहकाचा फोटो</label>
                <ImageUploader
                  value={draft.customer_photo_url}
                  onChange={(url) => setDraft({ ...draft, customer_photo_url: url })}
                  folder="testimonials"
                  testId="testimonial-photo-upload"
                />
              </div>
              <div>
                <label className="deva text-sm">Vimeo URL (ऐच्छिक)</label>
                <input
                  className={inputCls}
                  value={draft.vimeo_url}
                  onChange={(e) => setDraft({ ...draft, vimeo_url: e.target.value })}
                  data-testid="testimonial-vimeo"
                />
              </div>
              <div className="grid grid-cols-3 items-end gap-3">
                <div>
                  <label className="deva text-sm">रेटिंग</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    className={inputCls}
                    value={draft.rating}
                    onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })}
                    data-testid="testimonial-rating"
                  />
                </div>
                <div>
                  <label className="deva text-sm">क्रम</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={draft.display_order}
                    onChange={(e) => setDraft({ ...draft, display_order: Number(e.target.value) })}
                    data-testid="testimonial-order"
                  />
                </div>
                <label className="flex items-center gap-2 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={draft.is_active}
                    onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                    data-testid="testimonial-active"
                  />
                  <span className="deva">दाखवा</span>
                </label>
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
                data-testid="testimonial-save"
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
