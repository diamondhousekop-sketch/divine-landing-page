import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";

const BUCKET = "site-assets";
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const UploadInput = z.object({
  // data URL, e.g. "data:image/png;base64,AAAA..."
  data_url: z.string().min(1),
  // logical folder, e.g. "products", "testimonials", "site"
  folder: z.enum(["products", "testimonials", "site"]),
  filename: z.string().min(1).max(200).optional(),
});

export const Route = createFileRoute("/api/admin/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON body");
        }
        const parsed = UploadInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());

        const match = /^data:([^;]+);base64,(.+)$/.exec(parsed.data.data_url);
        if (!match) return badRequest("Invalid data URL");
        const [, contentType, base64] = match;
        if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
          return badRequest("Only JPG, PNG, WEBP, or GIF images are allowed");
        }
        if (!base64) return badRequest("Empty file data");

        let bytes: Uint8Array;
        try {
          bytes = Uint8Array.from(Buffer.from(base64, "base64"));
        } catch {
          return badRequest("Could not decode file data");
        }
        if (bytes.byteLength === 0) return badRequest("Empty file");
        if (bytes.byteLength > MAX_BYTES) return badRequest("File too large — max 5MB");

        const ext = (contentType.split("/")[1] || "bin").replace("jpeg", "jpg");
        const safeName = (parsed.data.filename || "upload")
          .replace(/[^a-zA-Z0-9._-]/g, "-")
          .slice(0, 60);
        const path = `${parsed.data.folder}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${safeName}.${ext}`;

        try {
          const admin = getAdminClient();
          const { error } = await admin.storage.from(BUCKET).upload(path, bytes, {
            contentType,
            upsert: false,
          });
          if (error) {
            console.error("[admin/upload] storage error:", error);
            return serverError("Upload failed — is the 'site-assets' storage bucket set up?");
          }
          const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
          return json({ url: pub.publicUrl, path });
        } catch (err) {
          console.error("[admin/upload]", err);
          return serverError();
        }
      },
    },
  },
});
