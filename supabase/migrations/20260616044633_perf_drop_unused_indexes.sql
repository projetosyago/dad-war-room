-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616044633
-- Original name: perf_drop_unused_indexes
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


DROP INDEX IF EXISTS public.event_occurrences_event_idx;
DROP INDEX IF EXISTS public.kingdom_milestones_category_idx;
DROP INDEX IF EXISTS public.member_accounts_role_idx;
DROP INDEX IF EXISTS public.member_accounts_active_idx;
DROP INDEX IF EXISTS public.login_events_account_idx;
DROP INDEX IF EXISTS public.login_events_recent_idx;
DROP INDEX IF EXISTS public.members_rank_idx;
DROP INDEX IF EXISTS public.members_power_idx;
DROP INDEX IF EXISTS public.member_accounts_member_id_idx;
DROP INDEX IF EXISTS public.poll_options_poll_idx;
DROP INDEX IF EXISTS public.poll_votes_account_idx;
DROP INDEX IF EXISTS public.poll_votes_poll_idx;
-- KEEP polls_closes_at_idx (planned "polls closing soon" sort)
