-- ============================================================
-- 0005_grants_base_privileges.sql
-- RLS controls per-row access, but PostgREST still needs the
-- underlying SELECT/INSERT/UPDATE/DELETE GRANTs on the roles.
-- This was missed in 0001 — fixing it unblocks all /rest/v1/*
-- queries.
-- ============================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.events             TO anon, authenticated;
GRANT SELECT ON public.event_occurrences  TO anon, authenticated;
GRANT SELECT ON public.kingdom_milestones TO anon, authenticated;
GRANT SELECT ON public.admin_users TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.events             TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_occurrences  TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.kingdom_milestones TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
