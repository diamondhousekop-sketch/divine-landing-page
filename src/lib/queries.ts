import { supabase } from "./supabase";
import {
  FALLBACK_CONTENT,
  FALLBACK_PRODUCT,
  FALLBACK_TESTIMONIALS,
  type Product,
  type Testimonial,
} from "./types";

// Public reads via the anon client + RLS (public SELECT where is_active). These
// run both during SSR (route loaders) and on the client. Everything degrades
// gracefully to fallbacks so the landing page always renders.

export async function getActiveProduct(): Promise<Pick<Product, "id" | "name" | "price" | "compare_at_price">> {
  try {
    const { data } = await supabase
      .from("products")
      .select("id,name,price,compare_at_price")
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (data) return data as Pick<Product, "id" | "name" | "price" | "compare_at_price">;
  } catch {
    /* ignore */
  }
  return { ...FALLBACK_PRODUCT };
}

export async function getTestimonials(): Promise<
  Pick<Testimonial, "customer_name" | "customer_city" | "quote">[]
> {
  try {
    const { data } = await supabase
      .from("testimonials")
      .select("customer_name,customer_city,quote")
      .eq("is_active", true)
      .order("display_order", { ascending: true });
    if (data && data.length) return data as Pick<Testimonial, "customer_name" | "customer_city" | "quote">[];
  } catch {
    /* ignore */
  }
  return FALLBACK_TESTIMONIALS;
}

export async function getSiteContent(): Promise<Record<string, string>> {
  const content: Record<string, string> = { ...FALLBACK_CONTENT };
  try {
    const { data } = await supabase.from("site_content").select("key,value");
    if (data) {
      for (const row of data as { key: string; value: unknown }[]) {
        const v = row.value;
        if (typeof v === "string") content[row.key] = v;
        else if (v && typeof v === "object" && "text" in (v as Record<string, unknown>)) {
          content[row.key] = String((v as Record<string, unknown>).text);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return content;
}
