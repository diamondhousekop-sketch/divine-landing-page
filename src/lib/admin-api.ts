import { supabase } from "./supabase";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function adminFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(await authHeaders()),
  };
  let url = path;
  if (options.params) url += "?" + new URLSearchParams(options.params).toString();

  const init: RequestInit = { method: options.method ?? "GET", headers };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  const res = await fetch(url, init);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error((data && (data.error as string)) || `Request failed (${res.status})`);
  }
  return data as T;
}

// Downloads a binary (e.g. PDF) from an authenticated admin endpoint and
// triggers a browser save dialog.
export async function adminDownload(path: string, fallbackName: string): Promise<void> {
  const res = await fetch(path, { headers: await authHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = `Download failed (${res.status})`;
    try {
      const d = JSON.parse(text);
      if (d?.error) msg = d.error as string;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  const disp = res.headers.get("content-disposition") || "";
  const match = disp.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] || fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Public (no auth) POST helper for the checkout flow.
export async function publicPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok)
    throw new Error((data && (data.error as string)) || `Request failed (${res.status})`);
  return data as T;
}
