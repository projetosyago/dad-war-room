-- ============================================================
-- 0001_initial_schema.sql
-- DAD War Room — core schema (events, milestones, admin)
-- ============================================================

-- ---------- ENUMS ----------

CREATE TYPE event_status AS ENUM ('active', 'coming-soon', 'archived');

CREATE TYPE milestone_category AS ENUM (
  'truegold', 'heroes', 'pets', 'pvp', 'feature', 'master', 'fog', 'war-academy', 'other'
);

-- ---------- TABLES ----------

CREATE TABLE public.admin_users (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  ingame_nick  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.admin_users IS 'Allowlist of users who can write to the war-room content tables.';

CREATE TABLE public.events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  short_name    TEXT,
  description   TEXT,
  icon_url      TEXT,
  guide_route   TEXT,
  status        event_status NOT NULL DEFAULT 'coming-soon',
  display_order INTEGER NOT NULL DEFAULT 100,
  accent_color  TEXT,
  is_seasonal   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at   TIMESTAMPTZ,
  created_by    UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE public.events IS 'Catalogue of game events. Each event can have many occurrences.';

CREATE INDEX events_status_idx ON public.events (status);
CREATE INDEX events_display_order_idx ON public.events (display_order);

CREATE TABLE public.event_occurrences (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  starts_at_utc    TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  phase_label      TEXT,
  notes            TEXT,
  recurrence_rule  TEXT,
  cancelled        BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES auth.users(id)
);

COMMENT ON COLUMN public.event_occurrences.recurrence_rule IS 'iCal RRULE string, e.g. FREQ=HOURLY;INTERVAL=48';
COMMENT ON COLUMN public.event_occurrences.phase_label IS 'Optional sub-phase (e.g. Prep / Castle Battle / Brawl / Final for KvK)';

CREATE INDEX event_occurrences_event_idx     ON public.event_occurrences (event_id);
CREATE INDEX event_occurrences_starts_at_idx ON public.event_occurrences (starts_at_utc);

CREATE TABLE public.kingdom_milestones (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  category        milestone_category NOT NULL,
  unlock_date_utc TIMESTAMPTZ,
  notes           TEXT,
  source_url      TEXT,
  display_order   INTEGER NOT NULL DEFAULT 100,
  achieved        BOOLEAN NOT NULL DEFAULT false,
  generation      INTEGER,
  tg_level        INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.kingdom_milestones IS 'Per-kingdom milestones (TG unlocks, hero/pet generations, masters, etc.) with countdown dates editable by admin.';

CREATE INDEX kingdom_milestones_category_idx     ON public.kingdom_milestones (category);
CREATE INDEX kingdom_milestones_unlock_date_idx  ON public.kingdom_milestones (unlock_date_utc);
CREATE INDEX kingdom_milestones_display_order_idx ON public.kingdom_milestones (display_order);

-- ---------- TRIGGERS ----------

CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER events_set_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER kingdom_milestones_set_updated_at
  BEFORE UPDATE ON public.kingdom_milestones
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ---------- HELPERS ----------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
