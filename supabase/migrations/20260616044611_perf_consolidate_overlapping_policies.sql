-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616044611
-- Original name: perf_consolidate_overlapping_policies
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


-- member_accounts: drop FOR ALL admin policy; add per-verb admin INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS member_accounts_admin_all ON public.member_accounts;
CREATE POLICY member_accounts_admin_insert ON public.member_accounts
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY member_accounts_admin_update ON public.member_accounts
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY member_accounts_admin_delete ON public.member_accounts
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

-- members: drop FOR ALL admin policy; add per-verb admin INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS members_admin_all ON public.members;
CREATE POLICY members_admin_insert ON public.members
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY members_admin_update ON public.members
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY members_admin_delete ON public.members
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

-- poll_options
DROP POLICY IF EXISTS poll_options_admin_all ON public.poll_options;
CREATE POLICY poll_options_admin_insert ON public.poll_options
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY poll_options_admin_update ON public.poll_options
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY poll_options_admin_delete ON public.poll_options
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

-- poll_votes
DROP POLICY IF EXISTS poll_votes_admin_all ON public.poll_votes;
CREATE POLICY poll_votes_admin_insert ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY poll_votes_admin_update ON public.poll_votes
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY poll_votes_admin_delete ON public.poll_votes
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

-- polls
DROP POLICY IF EXISTS polls_admin_all ON public.polls;
CREATE POLICY polls_admin_insert ON public.polls
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY polls_admin_update ON public.polls
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));
CREATE POLICY polls_admin_delete ON public.polls
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
