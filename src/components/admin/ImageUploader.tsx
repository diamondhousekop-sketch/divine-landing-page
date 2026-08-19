import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-api";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Small reusable image-upload control for admin forms. Shows a preview
 * thumbnail of `value` (a public URL) when set, an upload button, and an
 * optional clear (X) button. Uploads go through POST /api/admin/upload,
 * which stores the file in Supabase Storage and returns a public URL.
 */
export function ImageUploader({
  value,
  onChange,
  folder,
  label,
  aspect = "aspect-square",
  testId,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: "products" | "testimonials" | "site";
  label?: string;
  aspect?: string;
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const data_url = await fileToDataUrl(file);
      const res = await adminFetch<{ url: string }>("/api/admin/upload", {
        method: "POST",
        body: { data_url, folder, filename: file.name },
      });
      onChange(res.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {label && <label className="deva text-sm text-foreground">{label}</label>}
      <div className="mt-2 flex items-center gap-3">
        <div
          className={`relative flex ${aspect} w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card`}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={busy}
            data-testid={testId}
            className="deva rounded-full border border-border px-4 py-1.5 text-xs font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {value ? "बदला (Replace)" : "अपलोड करा"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="deva inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="h-3 w-3" /> काढा
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}
