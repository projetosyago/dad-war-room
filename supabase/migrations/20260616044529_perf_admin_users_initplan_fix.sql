-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616044529
-- Original name: perf_admin_users_initplan_fix
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


DROP POLICY IF EXISTS admin_users_self_select ON public.admin_users;
CREATE POLICY admin_users_self_select ON public.admin_users
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));
