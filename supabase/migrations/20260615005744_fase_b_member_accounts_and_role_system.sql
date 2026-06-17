-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615005744
-- Original name: fase_b_member_accounts_and_role_system
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- ═══════════════════════════════════════════════════════════════════
-- Fase B · Per-member accounts + role system (ally / member / r2-r5)
-- Locked-in design: PLANNING.md §1ter + "Ally accounts" subsection.
-- ═══════════════════════════════════════════════════════════════════

-- ── ENUMs ──────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_role') THEN
    CREATE TYPE public.account_role AS ENUM ('ally', 'member', 'r2', 'r3', 'r4', 'r5');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'login_event_type') THEN
    CREATE TYPE public.login_event_type AS ENUM (
      'signin', 'signout', 'pwa_install', 'pwa_uninstall',
      'password_change', 'failed_signin'
    );
  END IF;
END $$;

COMMENT ON TYPE public.account_role IS
  'ally = read-only guest from another alliance (NOT counted as a DAD member). member/r2/r3 = regular members. r4/r5 = admin.';

-- ── member_accounts: extends auth.users, one per person ────────────
CREATE TABLE IF NOT EXISTS public.member_accounts (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username            TEXT UNIQUE NOT NULL,
  display_name        TEXT NOT NULL,
  member_id           UUID,
  role                public.account_role NOT NULL DEFAULT 'member',
  language_code       TEXT NOT NULL DEFAULT 'en',
  avatar_hero_slug    TEXT,
  avatar_image_url    TEXT,
  active              BOOLEAN NOT NULL DEFAULT true,
  password_temporary  BOOLEAN NOT NULL DEFAULT true,
  first_login_at      TIMESTAMPTZ,
  last_login_at       TIMESTAMPTZ,
  pwa_installed_at    TIMESTAMPTZ,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.member_accounts IS
  'Per-person account for the DAD War Room. Linked to auth.users. role determines what they can write.';
COMMENT ON COLUMN public.member_accounts.username IS
  'Lowercase identifier the user types at /login (synthetic email = username || ''@dad-war-room.local'')';
COMMENT ON COLUMN public.member_accounts.role IS
  'ally = guest, member/r2/r3 = regular, r4/r5 = admin';

CREATE INDEX IF NOT EXISTS member_accounts_role_idx
  ON public.member_accounts (role);
CREATE INDEX IF NOT EXISTS member_accounts_active_idx
  ON public.member_accounts (active) WHERE active;
CREATE UNIQUE INDEX IF NOT EXISTS member_accounts_username_lower_idx
  ON public.member_accounts (lower(username));

-- ── login_events: audit log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID NOT NULL REFERENCES public.member_accounts(id) ON DELETE CASCADE,
  event_type  public.login_event_type NOT NULL,
  user_agent  TEXT,
  ip_hash     TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.login_events IS
  'Audit log of sign-ins, PWA installs, password changes. Drives "who has logged in" panel for admins.';

CREATE INDEX IF NOT EXISTS login_events_account_idx
  ON public.login_events (account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS login_events_recent_idx
  ON public.login_events (occurred_at DESC) WHERE event_type = 'signin';

-- ── Helper functions ───────────────────────────────────────────────
-- SECURITY DEFINER lets these bypass RLS on member_accounts when called from
-- RLS policies (otherwise we'd recurse). Locked search_path = '' so it's safe.

CREATE OR REPLACE FUNCTION public.account_role()
RETURNS public.account_role
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.member_accounts
  WHERE id = (SELECT auth.uid()) AND active
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_accounts
    WHERE id = (SELECT auth.uid()) AND active AND role IN ('r4', 'r5')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_voting_member()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_accounts
    WHERE id = (SELECT auth.uid()) AND active AND role IN ('member', 'r2', 'r3', 'r4', 'r5')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_ally()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_accounts
    WHERE id = (SELECT auth.uid()) AND active AND role = 'ally'
  )
$$;

REVOKE ALL ON FUNCTION public.account_role()      FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin()          FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_voting_member()  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_ally()           FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_role()      TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_voting_member()  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ally()           TO authenticated;

-- ── updated_at trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS member_accounts_updated_at ON public.member_accounts;
CREATE TRIGGER member_accounts_updated_at
  BEFORE UPDATE ON public.member_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────
ALTER TABLE public.member_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_events    ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read all accounts (needed for roster, chat
-- author lookup, member tagging). The repo layer filters allies out of
-- "member list" responses; UI tags ally rows with the ALLY chip.
DROP POLICY IF EXISTS member_accounts_select ON public.member_accounts;
CREATE POLICY member_accounts_select ON public.member_accounts
  FOR SELECT TO authenticated
  USING (true);

-- Self-update: a user can update their own row, but cannot promote
-- themselves (role change requires admin).
DROP POLICY IF EXISTS member_accounts_update_self ON public.member_accounts;
CREATE POLICY member_accounts_update_self ON public.member_accounts
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND (role = (SELECT role FROM public.member_accounts WHERE id = (SELECT auth.uid()))
         OR public.is_admin())
  );

-- Admin: full access to all accounts (create members, create allies, reset)
DROP POLICY IF EXISTS member_accounts_admin_all ON public.member_accounts;
CREATE POLICY member_accounts_admin_all ON public.member_accounts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- login_events: self-read + admin-read
DROP POLICY IF EXISTS login_events_select ON public.login_events;
CREATE POLICY login_events_select ON public.login_events
  FOR SELECT TO authenticated
  USING (account_id = (SELECT auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS login_events_insert ON public.login_events;
CREATE POLICY login_events_insert ON public.login_events
  FOR INSERT TO authenticated
  WITH CHECK (account_id = (SELECT auth.uid()));
