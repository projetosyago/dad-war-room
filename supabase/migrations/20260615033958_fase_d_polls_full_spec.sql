-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615033958
-- Original name: fase_d_polls_full_spec
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- ═══════════════════════════════════════════════════════════════════
-- Fase D · Polls FULL spec (PLANNING.md §1quater)
-- Adds: status workflow, results_visibility ENUM, opens_at/closed_at,
-- short share_token, RLS update for status-aware visibility.
-- ═══════════════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poll_status') THEN
    CREATE TYPE public.poll_status AS ENUM ('draft', 'open', 'closed', 'archived');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'results_visibility') THEN
    CREATE TYPE public.results_visibility AS ENUM ('during', 'after_close', 'admin_only');
  END IF;
END $$;

-- Add new columns (idempotent).
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS status              public.poll_status NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS opens_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_token         TEXT,
  ADD COLUMN IF NOT EXISTS results_visibility  public.results_visibility NOT NULL DEFAULT 'during';

-- Migrate existing boolean (results_visible_during_voting) → ENUM.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'polls'
    AND column_name = 'results_visible_during_voting'
  ) THEN
    UPDATE public.polls
       SET results_visibility = CASE
         WHEN results_visible_during_voting THEN 'during'::public.results_visibility
         ELSE 'after_close'::public.results_visibility
       END;
    ALTER TABLE public.polls DROP COLUMN results_visible_during_voting;
  END IF;
END $$;

-- Backfill share_token for any existing polls (6-char base62).
UPDATE public.polls
   SET share_token = substr(md5(random()::text || id::text), 1, 6)
 WHERE share_token IS NULL;

-- Lock share_token uniqueness.
ALTER TABLE public.polls ALTER COLUMN share_token SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS polls_share_token_unique
  ON public.polls (share_token);

-- Indexes for new filtering paths.
CREATE INDEX IF NOT EXISTS polls_status_idx ON public.polls (status);

-- ─── Update RLS: voting requires status='open' AND not past deadline ──
DROP POLICY IF EXISTS poll_votes_insert ON public.poll_votes;
CREATE POLICY poll_votes_insert ON public.poll_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    account_id = (SELECT auth.uid())
    AND public.is_voting_member()
    AND EXISTS (
      SELECT 1 FROM public.polls p
      WHERE p.id = poll_votes.poll_id
      AND p.status = 'open'
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
      AND p.status = 'open'
      AND (p.closes_at IS NULL OR p.closes_at > NOW())
    )
  );

-- Drafts and archived: still publicly SELECTable (we filter in UI).
-- Vote results visibility (admin_only mode): we ENFORCE in app code
-- via the repo helper. RLS lets everyone read poll_votes; the app filters.
