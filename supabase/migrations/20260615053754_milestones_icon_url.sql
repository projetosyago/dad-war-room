-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615053754
-- Original name: milestones_icon_url
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

ALTER TABLE public.kingdom_milestones
  ADD COLUMN IF NOT EXISTS icon_url text;
COMMENT ON COLUMN public.kingdom_milestones.icon_url IS
  'Optional per-milestone icon override (path under /public/images/* or full URL). Falls back to smart resolver when null.';
