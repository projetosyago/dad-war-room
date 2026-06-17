-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616060557
-- Original name: members_power_snapshots
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

CREATE TABLE IF NOT EXISTS public.member_power_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  power_m numeric NOT NULL,
  tg_level integer,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS member_power_snapshots_member_time_idx
  ON public.member_power_snapshots (member_id, snapshot_at DESC);

CREATE OR REPLACE FUNCTION public.tg_member_power_snapshot()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
BEGIN
  IF NEW.power_m IS DISTINCT FROM OLD.power_m OR NEW.tg_level IS DISTINCT FROM OLD.tg_level THEN
    INSERT INTO public.member_power_snapshots (member_id, power_m, tg_level)
    VALUES (NEW.id, NEW.power_m, NEW.tg_level);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS members_power_snapshot_trg ON public.members;
CREATE TRIGGER members_power_snapshot_trg
  AFTER UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.tg_member_power_snapshot();

ALTER TABLE public.member_power_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY mps_select ON public.member_power_snapshots FOR SELECT USING (true);
GRANT SELECT ON public.member_power_snapshots TO authenticated, anon;
