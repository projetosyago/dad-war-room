-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615005852
-- Original name: fase_b_harden_touch_updated_at
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

ALTER FUNCTION public.touch_updated_at() SET search_path = '';
