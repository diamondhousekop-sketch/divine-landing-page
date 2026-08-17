import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";

const CreateInput = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_city: z.string().trim().max(120).optional().or(z.literal("")),
  quote: z.string().trim().min(2).max(1000),
  vimeo_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5).default(5),
  display_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});
const UpdateInput = CreateInput.partial().extend({ id: z.string().uuid() });

export const Route = createFileRoute("/api/admin/testimonials")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("testimonials")
          .select("*")
          .order("display_order", { ascending: true });
        if (error) return serverError("Could not load testimonials");
        return json({ testimonials: data ?? [] });
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
        const payload = { ...parsed.data, vimeo_url: parsed.data.vimeo_url || null };
        const admin = getAdminClient();
        const { data, error } = await admin
          .from("testimonials")
          .insert(payload)
          .select("*")
          .single();
        if (error) return serverError("Could not create testimonial");
        return json({ testimonial: data });
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
          .from("testimonials")
          .update(updates)
          .eq("id", id)
          .select("*")
          .single();
        if (error) return serverError("Could not update testimonial");
        return json({ testimonial: data });
      },

      DELETE: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        const id = new URL(request.url).searchParams.get("id");
        if (!id) return badRequest("Missing id");
        const admin = getAdminClient();
        const { error } = await admin.from("testimonials").delete().eq("id", id);
        if (error) return serverError("Could not delete testimonial");
        return json({ ok: true });
      },
    },
  },
});
