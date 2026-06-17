-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616044514
-- Original name: perf_add_fk_indexes
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


CREATE INDEX IF NOT EXISTS event_occurrences_created_by_idx ON public.event_occurrences(created_by);
CREATE INDEX IF NOT EXISTS events_created_by_idx ON public.events(created_by);
CREATE INDEX IF NOT EXISTS member_accounts_created_by_idx ON public.member_accounts(created_by);
CREATE INDEX IF NOT EXISTS poll_votes_option_id_idx ON public.poll_votes(option_id);
CREATE INDEX IF NOT EXISTS polls_created_by_idx ON public.polls(created_by);
CREATE INDEX IF NOT EXISTS polls_event_occurrence_id_idx ON public.polls(event_occurrence_id);
