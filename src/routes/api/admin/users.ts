import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAdminClient, requireAdmin, unauthorized } from "@/lib/supabase.server";
import { json, badRequest, serverError } from "@/lib/http.server";

const CreateInput = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
});

const UpdatePasswordInput = z.object({
  id: z.string().uuid(),
  password: z.string().min(8).max(200),
});

export const Route = createFileRoute("/api/admin/users")({
  server: {
    handlers: {
      // List every admin account. Any authenticated Supabase user is treated
      // as an admin (there is no separate roles table), so this simply lists
      // all Supabase Auth users.
      GET: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        try {
          const admin = getAdminClient();
          const { data, error } = await admin.auth.admin.listUsers({ perPage: 200 });
          if (error) return serverError("Could not list admins");
          const users = data.users
            .map((u) => ({ id: u.id, email: u.email ?? "", created_at: u.created_at }))
            .sort((a, b) => a.created_at.localeCompare(b.created_at));
          return json({ users, self_id: user.id });
        } catch (err) {
          console.error("[admin/users GET]", err);
          return serverError();
        }
      },

      // Create a new admin. email_confirm: true means the account is usable
      // immediately with the given password - no confirmation email, no
      // broken redirect link, no waiting. The new admin can log in right away.
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
        try {
          const admin = getAdminClient();
          const { data, error } = await admin.auth.admin.createUser({
            email: parsed.data.email,
            password: parsed.data.password,
            email_confirm: true,
          });
          if (error) return badRequest(error.message || "Could not create admin");
          return json({ user: { id: data.user.id, email: data.user.email } });
        } catch (err) {
          console.error("[admin/users POST]", err);
          return serverError();
        }
      },

      // Set ANY admin's password instantly (service-role bypasses the need
      // for the user to confirm anything by email). Use this instead of the
      // self-service /admin/account flow when resetting someone else's
      // forgotten password.
      PATCH: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return badRequest("Invalid JSON");
        }
        const parsed = UpdatePasswordInput.safeParse(body);
        if (!parsed.success) return badRequest("Validation failed", parsed.error.flatten());
        try {
          const admin = getAdminClient();
          const { error } = await admin.auth.admin.updateUserById(parsed.data.id, {
            password: parsed.data.password,
          });
          if (error) return badRequest(error.message || "Could not update password");
          return json({ updated: true });
        } catch (err) {
          console.error("[admin/users PATCH]", err);
          return serverError();
        }
      },

      // Remove an admin account. Guarded so nobody can delete themselves or
      // remove the last remaining admin (which would lock everyone out).
      DELETE: async ({ request }) => {
        const user = await requireAdmin(request);
        if (!user) return unauthorized();
        try {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");
          if (!id || !z.string().uuid().safeParse(id).success) {
            return badRequest("Valid admin id required");
          }
          if (id === user.id) return badRequest("तुम्ही स्वतःचा अकाउंट डिलीट करू शकत नाही.");
          const admin = getAdminClient();
          const { data: listData, error: listErr } = await admin.auth.admin.listUsers({
            perPage: 200,
          });
          if (listErr) return serverError("Could not verify admin count");
          if (listData.users.length <= 1) {
            return badRequest("शेवटचा अ‍ॅडमिन डिलीट करता येणार नाही.");
          }
          const { error } = await admin.auth.admin.deleteUser(id);
          if (error) return serverError("Could not delete admin");
          return json({ deleted: true, id });
        } catch (err) {
          console.error("[admin/users DELETE]", err);
          return serverError();
        }
      },
    },
  },
});
