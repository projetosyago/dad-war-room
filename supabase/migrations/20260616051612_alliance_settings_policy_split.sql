-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616051612
-- Original name: alliance_settings_policy_split
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


-- Replace FOR ALL admin write with per-verb INSERT/UPDATE/DELETE so the implicit
-- SELECT grant no longer overlaps with the public _select policy (Lesson 11).
DROP POLICY IF EXISTS alliance_settings_admin_write ON public.alliance_settings;

CREATE POLICY alliance_settings_admin_insert ON public.alliance_settings
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY alliance_settings_admin_update ON public.alliance_settings
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY alliance_settings_admin_delete ON public.alliance_settings
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));
