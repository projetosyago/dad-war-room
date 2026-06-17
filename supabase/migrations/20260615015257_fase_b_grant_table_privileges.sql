-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615015257
-- Original name: fase_b_grant_table_privileges
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- ═══════════════════════════════════════════════════════════════════
-- This Supabase project's default privileges don't auto-grant table-level
-- SELECT/INSERT/UPDATE/DELETE to `authenticated` and `service_role` for
-- new tables in `public` (most projects do — quirk of how this one was set up).
--
-- RLS bypass on service_role is SEPARATE from table privileges: even with
-- BYPASSRLS, you still need GRANT or you hit "permission denied for table".
-- Same for `authenticated`: even if an RLS policy allows the write, no GRANT
-- means PostgREST returns 401/permission denied at the GRANT layer.
-- ═══════════════════════════════════════════════════════════════════

-- service_role: full table access (admin Edge Functions need this).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.login_events    TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_users     TO service_role;

-- authenticated: needs to write through RLS policies (self-update, admin all,
-- login_events insert). RLS still gates WHICH rows; GRANT just allows the verb.
GRANT INSERT, UPDATE, DELETE ON public.member_accounts TO authenticated;
GRANT INSERT                 ON public.login_events    TO authenticated;

-- Default privileges going forward (any future CREATE TABLE in public).
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
