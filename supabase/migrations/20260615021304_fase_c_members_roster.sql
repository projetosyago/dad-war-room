-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615021304
-- Original name: fase_c_members_roster
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- ═══════════════════════════════════════════════════════════════════
-- Fase C · Alliance member roster (88 in-game DAD members)
-- ═══════════════════════════════════════════════════════════════════
-- `members` = the in-game character/identity (nick, power, troop tier,
-- in-game alliance rank). DIFFERENT from `member_accounts` (the login).
-- A member_account.member_id (already nullable on that table) FKs here.
-- An ally account never has a member_id — they're not DAD members.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alliance_rank') THEN
    CREATE TYPE public.alliance_rank AS ENUM ('r1', 'r2', 'r3', 'r4', 'r5');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_subgroup') THEN
    CREATE TYPE public.member_subgroup AS ENUM ('lieutenant', 'alpha', 'enforcerer', 'supreme');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'member_status') THEN
    CREATE TYPE public.member_status AS ENUM ('active', 'temporary_out', 'left');
  END IF;
END $$;

COMMENT ON TYPE public.alliance_rank   IS 'In-game alliance rank: r1 (newcomer) → r5 (founder).';
COMMENT ON TYPE public.member_subgroup IS 'Internal squad label: lieutenant (R1), alpha (R2), enforcerer (R3), supreme (R4). R5 has none.';
COMMENT ON TYPE public.member_status   IS 'active = in alliance · temporary_out = lent out, returning · left = no longer in DAD.';

CREATE TABLE IF NOT EXISTS public.members (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nick              TEXT NOT NULL,
  rank              public.alliance_rank NOT NULL,
  subgroup          public.member_subgroup,
  power_m           NUMERIC(7, 1) NOT NULL DEFAULT 0,
  tg_level          INTEGER CHECK (tg_level BETWEEN 1 AND 8),
  town_center_level INTEGER CHECK (town_center_level BETWEEN 1 AND 30),
  dad_tag           TEXT,
  tag_position      TEXT,
  status            public.member_status NOT NULL DEFAULT 'active',
  status_note       TEXT,
  lang_hint         TEXT,
  note              TEXT,
  display_order     INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT members_tier_xor_tc CHECK (
    NOT (tg_level IS NOT NULL AND town_center_level IS NOT NULL)
  )
);

COMMENT ON TABLE public.members IS
  'In-game alliance roster — one row per DAD member. NOT for allies.';
COMMENT ON COLUMN public.members.power_m IS
  'Power in MILLIONS (e.g. 158.7). NUMERIC(7,1) lets us go to 9,999,999.9M = 9.99T.';
COMMENT ON COLUMN public.members.tg_level IS
  'TG tier (1-8) for advanced players. Mutually exclusive with town_center_level.';
COMMENT ON COLUMN public.members.dad_tag IS
  '"prefix" | "suffix" | NULL — where the [DAD] tag goes in their in-game nick.';

CREATE UNIQUE INDEX IF NOT EXISTS members_nick_unique
  ON public.members (lower(nick));
CREATE INDEX IF NOT EXISTS members_rank_idx
  ON public.members (rank);
CREATE INDEX IF NOT EXISTS members_status_idx
  ON public.members (status);
CREATE INDEX IF NOT EXISTS members_power_idx
  ON public.members (power_m DESC);
CREATE INDEX IF NOT EXISTS members_display_order_idx
  ON public.members (display_order);

DROP TRIGGER IF EXISTS members_updated_at ON public.members;
CREATE TRIGGER members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_select ON public.members;
CREATE POLICY members_select ON public.members
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS members_admin_all ON public.members;
CREATE POLICY members_admin_all ON public.members
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Link member_accounts.member_id (already exists as nullable UUID) to members(id).
-- ON DELETE SET NULL: if a member leaves the alliance, their account stays but
-- becomes "unlinked" (admin can re-link them or convert to ally).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'member_accounts_member_id_fkey'
  ) THEN
    ALTER TABLE public.member_accounts
      ADD CONSTRAINT member_accounts_member_id_fkey
      FOREIGN KEY (member_id) REFERENCES public.members(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS member_accounts_member_id_idx
  ON public.member_accounts (member_id);
