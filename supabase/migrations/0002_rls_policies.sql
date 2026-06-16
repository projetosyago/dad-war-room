-- ============================================================
-- 0002_rls_policies.sql
-- Public read of all content; admin-only write.
-- ============================================================

ALTER TABLE public.admin_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_occurrences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kingdom_milestones  ENABLE ROW LEVEL SECURITY;

CREATE POLICY admin_users_self_select ON public.admin_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY events_public_select ON public.events
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY events_admin_insert ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY events_admin_update ON public.events
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY events_admin_delete ON public.events
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY occurrences_public_select ON public.event_occurrences
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY occurrences_admin_insert ON public.event_occurrences
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY occurrences_admin_update ON public.event_occurrences
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY occurrences_admin_delete ON public.event_occurrences
  FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY milestones_public_select ON public.kingdom_milestones
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY milestones_admin_insert ON public.kingdom_milestones
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY milestones_admin_update ON public.kingdom_milestones
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY milestones_admin_delete ON public.kingdom_milestones
  FOR DELETE TO authenticated
  USING (public.is_admin());
