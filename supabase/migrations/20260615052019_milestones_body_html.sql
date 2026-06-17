-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615052019
-- Original name: milestones_body_html
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- Salles 2026-06-15: rich admin-authored detail page for each Kingdom
-- Timeline milestone. body_html is Tiptap output (sanitized at admin save).
-- nullable so existing rows don't break; UI renders a "stub" placeholder.
ALTER TABLE public.kingdom_milestones
  ADD COLUMN IF NOT EXISTS body_html text;

COMMENT ON COLUMN public.kingdom_milestones.body_html IS
  'Rich content (Tiptap HTML) shown on /timeline/:slug. Authored by admins.';
