-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615032838
-- Original name: fase_d_polls_system
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- ═══════════════════════════════════════════════════════════════════
-- Fase D · Polls system
-- ═══════════════════════════════════════════════════════════════════
-- Examples Salles described:
--   Viking time poll:        type=multi, options=time slots, optional event link
--   Swordland legion pref:   type=single, options=[L1, L2, "can't participate"]
-- Allies see polls + results but never vote (RLS via is_voting_member()).
-- Re-vote = DELETE + INSERT (repo layer, not a trigger).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poll_type') THEN
    CREATE TYPE public.poll_type AS ENUM ('single', 'multi');
  END IF;
END $$;

-- ─── polls ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.polls (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                            TEXT UNIQUE NOT NULL,
  title                           TEXT NOT NULL,
  description                     TEXT,
  type                            public.poll_type NOT NULL,
  closes_at                       TIMESTAMPTZ,
  results_visible_during_voting   BOOLEAN NOT NULL DEFAULT true,
  event_occurrence_id             UUID REFERENCES public.event_occurrences(id) ON DELETE SET NULL,
  created_by                      UUID REFERENCES auth.users(id),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.polls IS
  'Alliance polls: single or multi-select. Optionally tied to an event_occurrence so admin can cascade results into legion/squad assignment.';
COMMENT ON COLUMN public.polls.slug IS
  'URL-friendly stable identifier — shareable: /polls/{slug}';
COMMENT ON COLUMN public.polls.closes_at IS
  'Deadline. NULL = open indefinitely. After this, voting blocked.';

CREATE INDEX IF NOT EXISTS polls_closes_at_idx   ON public.polls (closes_at);
CREATE INDEX IF NOT EXISTS polls_created_at_idx  ON public.polls (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS polls_slug_lower_idx ON public.polls (lower(slug));

DROP TRIGGER IF EXISTS polls_updated_at ON public.polls;
CREATE TRIGGER polls_updated_at
  BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ─── poll_options ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poll_options (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id         UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  display_order   INTEGER NOT NULL DEFAULT 0,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN public.poll_options.metadata IS
  'Structured tag for cascades. e.g. { "legion": 1 } or { "time_utc": "18:00" }';

CREATE INDEX IF NOT EXISTS poll_options_poll_idx
  ON public.poll_options (poll_id, display_order);

-- ─── poll_votes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poll_votes (
  poll_id     UUID NOT NULL REFERENCES public.polls(id)         ON DELETE CASCADE,
  option_id   UUID NOT NULL REFERENCES public.poll_options(id)  ON DELETE CASCADE,
  account_id  UUID NOT NULL REFERENCES public.member_accounts(id) ON DELETE CASCADE,
  voted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (poll_id, option_id, account_id)
);

CREATE INDEX IF NOT EXISTS poll_votes_account_idx ON public.poll_votes (account_id);
CREATE INDEX IF NOT EXISTS poll_votes_poll_idx    ON public.poll_votes (poll_id);

-- ─── RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.polls        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes   ENABLE ROW LEVEL SECURITY;

-- polls: read by all authenticated, write by admin.
DROP POLICY IF EXISTS polls_select ON public.polls;
CREATE POLICY polls_select ON public.polls
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS polls_admin_all ON public.polls;
CREATE POLICY polls_admin_all ON public.polls
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- poll_options: same rules.
DROP POLICY IF EXISTS poll_options_select ON public.poll_options;
CREATE POLICY poll_options_select ON public.poll_options
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS poll_options_admin_all ON public.poll_options;
CREATE POLICY poll_options_admin_all ON public.poll_options
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- poll_votes:
--   SELECT: any authenticated (results visible to allies too)
--   INSERT: voting members only, only own votes, only if poll is open
--   DELETE: own votes, only if poll is open (re-vote workflow)
--   Admin: full control
DROP POLICY IF EXISTS poll_votes_select ON public.poll_votes;
CREATE POLICY poll_votes_select ON public.poll_votes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS poll_votes_insert ON public.poll_votes;
CREATE POLICY poll_votes_insert ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    account_id = (SELECT auth.uid())
    AND public.is_voting_member()
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_votes.poll_id
      AND (p.closes_at IS NULL OR p.closes_at > NOW())
    )
  );

DROP POLICY IF EXISTS poll_votes_delete_self ON public.poll_votes;
CREATE POLICY poll_votes_delete_self ON public.poll_votes
  FOR DELETE TO authenticated
  USING (
    account_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_votes.poll_id
      AND (p.closes_at IS NULL OR p.closes_at > NOW())
    )
  );

DROP POLICY IF EXISTS poll_votes_admin_all ON public.poll_votes;
CREATE POLICY poll_votes_admin_all ON public.poll_votes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─── Grants (this project doesn't auto-grant — see Fase B note) ─────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls        TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_options TO service_role, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes   TO service_role, authenticated;
