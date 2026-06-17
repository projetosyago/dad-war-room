-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616060607
-- Original name: event_participants
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

CREATE TABLE IF NOT EXISTS public.event_participants (
  event_occurrence_id uuid NOT NULL REFERENCES public.event_occurrences(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  participation_role text CHECK (participation_role IN ('leader','joiner','standby')),
  notes text,
  added_by uuid REFERENCES public.member_accounts(id),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_occurrence_id, member_id)
);
CREATE INDEX IF NOT EXISTS event_participants_member_idx ON public.event_participants(member_id);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY ep_select ON public.event_participants FOR SELECT USING (true);
CREATE POLICY ep_admin_insert ON public.event_participants FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY ep_admin_update ON public.event_participants FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY ep_admin_delete ON public.event_participants FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_participants TO authenticated;
GRANT SELECT ON public.event_participants TO anon;
