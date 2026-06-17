-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616044704
-- Original name: perf_consolidate_remaining_admin_self_overlaps
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


-- Merge admin UPDATE + self UPDATE into a single policy on member_accounts
DROP POLICY IF EXISTS member_accounts_admin_update ON public.member_accounts;
DROP POLICY IF EXISTS member_accounts_update_self ON public.member_accounts;
CREATE POLICY member_accounts_update ON public.member_accounts
  FOR UPDATE TO authenticated
  USING (
    (SELECT is_admin())
    OR id = (SELECT auth.uid())
  )
  WITH CHECK (
    (SELECT is_admin())
    OR (
      id = (SELECT auth.uid())
      AND (
        role = (SELECT ma.role FROM public.member_accounts ma WHERE ma.id = (SELECT auth.uid()))
      )
    )
  );

-- Merge admin DELETE + delete_self on poll_votes
DROP POLICY IF EXISTS poll_votes_admin_delete ON public.poll_votes;
DROP POLICY IF EXISTS poll_votes_delete_self ON public.poll_votes;
CREATE POLICY poll_votes_delete ON public.poll_votes
  FOR DELETE TO authenticated
  USING (
    (SELECT is_admin())
    OR (
      account_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.polls p
        WHERE p.id = poll_votes.poll_id
          AND p.status = 'open'::poll_status
          AND (p.closes_at IS NULL OR p.closes_at > now())
      )
    )
  );

-- Merge admin INSERT + self INSERT on poll_votes
DROP POLICY IF EXISTS poll_votes_admin_insert ON public.poll_votes;
DROP POLICY IF EXISTS poll_votes_insert ON public.poll_votes;
CREATE POLICY poll_votes_insert ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT is_admin())
    OR (
      account_id = (SELECT auth.uid())
      AND (SELECT is_voting_member())
      AND EXISTS (
        SELECT 1 FROM public.polls p
        WHERE p.id = poll_votes.poll_id
          AND p.status = 'open'::poll_status
          AND (p.closes_at IS NULL OR p.closes_at > now())
      )
    )
  );
