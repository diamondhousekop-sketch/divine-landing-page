import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";

const PutInput = z.object({
  entries: z.array(z.object({ key: z.string().min(1).max(80), value: z.any() })).min(1),
});

export const Route = createFileRoute("/api/admin/content")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        const admin = getAdminClient();
        const { data, error } = await admin.from("site_content").select("*");
        if (error) return serverError("Could not load content");
        return json({ content: data ?? [] });
      },

      PUT: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON");
        }
        const parsed = PutInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        const admin = getAdminClient();
        const rows = parsed.data.entries.map((e) => ({ key: e.key, value: e.value }));
        const { error } = await admin.from("site_content").upsert(rows, { onConflict: "key" });
        if (error) return serverError("Could not save content");
        return json({ ok: true });
      },
    },
  },
});
