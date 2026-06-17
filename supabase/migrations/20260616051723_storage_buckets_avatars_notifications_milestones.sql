-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616051723
-- Original name: storage_buckets_avatars_notifications_milestones
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


-- Create three public-read storage buckets backing the planned image upload feature.
-- Writes are RLS-protected below; reads are open so public Hub/Alliance/Members
-- pages can render images via the public CDN URL without signed-URL overhead.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('avatars', 'avatars', true, 2097152,
    ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[]),
  ('notification-images', 'notification-images', true, 5242880,
    ARRAY['image/jpeg','image/png','image/webp']::text[]),
  ('milestone-bodies', 'milestone-bodies', true, 5242880,
    ARRAY['image/jpeg','image/png','image/webp','image/gif']::text[])
ON CONFLICT (id) DO NOTHING;

-- avatars: authenticated user may write only under their own auth.uid() prefix
DROP POLICY IF EXISTS avatars_insert_own ON storage.objects;
CREATE POLICY avatars_insert_own ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS avatars_update_own ON storage.objects;
CREATE POLICY avatars_update_own ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS avatars_delete_own ON storage.objects;
CREATE POLICY avatars_delete_own ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

-- notification-images: admin-only write/update/delete
DROP POLICY IF EXISTS notif_images_admin_all ON storage.objects;
CREATE POLICY notif_images_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'notification-images' AND (SELECT public.is_admin()))
  WITH CHECK (bucket_id = 'notification-images' AND (SELECT public.is_admin()));

-- milestone-bodies: admin-only write/update/delete
DROP POLICY IF EXISTS milestone_bodies_admin_all ON storage.objects;
CREATE POLICY milestone_bodies_admin_all ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'milestone-bodies' AND (SELECT public.is_admin()))
  WITH CHECK (bucket_id = 'milestone-bodies' AND (SELECT public.is_admin()));
