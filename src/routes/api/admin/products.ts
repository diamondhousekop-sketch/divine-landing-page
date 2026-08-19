import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";

const CreateInput = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.number().min(0),
  compare_at_price: z.number().min(0).nullable().optional(),
  images: z.array(z.string()).default([]),
  video_url: z.string().trim().max(500).optional().or(z.literal("")),
  stock_quantity: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
const UpdateInput = CreateInput.partial().extend({ id: z.string().uuid() });

export const Route = createFileRoute("/api/admin/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("products")
          .select("*")
          .order("created_at", { ascending: true });
        if (error) return serverError("Could not load products");
        return json({ products: data ?? [] });
      },

      POST: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON");
        }
        const parsed = CreateInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("products")
          .insert(parsed.data)
          .select("*")
          .single();
        if (error) return serverError("Could not create product");
        return json({ product: data });
      },

      PATCH: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON");
        }
        const parsed = UpdateInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        const { id, ...updates } = parsed.data;
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("products")
          .update(updates)
          .eq("id", id)
          .select("*")
          .single();
        if (error) return serverError("Could not update product");
        return json({ product: data });
      },

      DELETE: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return badRequest("Missing id");
        const admin = getAdminClient();
        const { error } = await admin.from("products").delete().eq("id", id);
        if (error) return serverError("Could not delete product");
        return json({ ok: true });
      },
    },
  },
});
