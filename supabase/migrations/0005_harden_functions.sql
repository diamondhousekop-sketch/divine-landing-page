-- Security hardening: pin the search_path of the updated_at trigger function so
-- it cannot be hijacked by a malicious schema (Supabase linter 0011).
alter function public.set_updated_at() set search_path = public;
