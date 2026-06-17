-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616044907
-- Original name: alliance_settings_singleton
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

CREATE TABLE IF NOT EXISTS public.alliance_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  rank text,
  motto text,
  tagline text,
  brand_primary text,
  brand_accent text,
  captured_at date,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS alliance_settings_singleton_idx
  ON public.alliance_settings ((singleton)) WHERE singleton = true;

ALTER TABLE public.alliance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY alliance_settings_select ON public.alliance_settings
  FOR SELECT USING (true);
CREATE POLICY alliance_settings_admin_write ON public.alliance_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alliance_settings TO authenticated;
GRANT SELECT ON public.alliance_settings TO anon;

INSERT INTO public.alliance_settings (rank, motto, tagline, brand_primary, brand_accent, captured_at)
SELECT '#2', 'Elegance in Peace, Chaos in Battle.', 'Kingdom 1652', '#f4cf73', '#e25656', CURRENT_DATE
WHERE NOT EXISTS (SELECT 1 FROM public.alliance_settings WHERE singleton = true);
