-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616060625
-- Original name: game_catalogue_schema
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

CREATE TYPE public.troop_branch AS ENUM ('infantry','cavalry','archer');

CREATE TABLE IF NOT EXISTS public.heroes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  generation integer NOT NULL CHECK (generation BETWEEN 1 AND 12),
  role text,
  preferred_branch public.troop_branch,
  portrait_url text,
  description text,
  released_at date,
  display_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS heroes_active_idx ON public.heroes(active);

CREATE TABLE IF NOT EXISTS public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  generation integer NOT NULL CHECK (generation BETWEEN 1 AND 12),
  portrait_url text,
  description text,
  released_at date,
  display_order integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  unlock_order integer NOT NULL UNIQUE,
  portrait_url text,
  description text,
  released_at date,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.troop_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_label text UNIQUE NOT NULL,
  is_truegold boolean NOT NULL,
  display_order integer NOT NULL,
  training_building_level integer,
  icon_url text,
  description text
);

CREATE TABLE IF NOT EXISTS public.troop_tier_branch_icons (
  tier_id uuid REFERENCES public.troop_tiers(id) ON DELETE CASCADE,
  branch public.troop_branch NOT NULL,
  icon_url text NOT NULL,
  PRIMARY KEY (tier_id, branch)
);

ALTER TABLE public.heroes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.troop_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.troop_tier_branch_icons ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['heroes','pets','masters','troop_tiers','troop_tier_branch_icons']) LOOP
    EXECUTE format('CREATE POLICY %I_select ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY %I_admin_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_admin()));', t, t);
    EXECUTE format('CREATE POLICY %I_admin_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));', t, t);
    EXECUTE format('CREATE POLICY %I_admin_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT public.is_admin()));', t, t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT SELECT ON public.%I TO anon;', t);
  END LOOP;
END $$;
