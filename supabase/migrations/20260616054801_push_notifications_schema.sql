-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616054801
-- Original name: push_notifications_schema
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.member_accounts(id) ON DELETE CASCADE,
  endpoint text UNIQUE NOT NULL,
  p256dh text NOT NULL,
  auth_token text NOT NULL,
  language_code text NOT NULL DEFAULT 'en',
  user_agent text,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS push_subscriptions_account_idx ON public.push_subscriptions(account_id) WHERE active = true;

CREATE TABLE IF NOT EXISTS public.push_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  emoji text,
  image_url text,
  audience text NOT NULL CHECK (audience IN ('all','voting','admins','allies','custom')),
  custom_account_ids uuid[],
  tap_target text NOT NULL DEFAULT 'hub' CHECK (tap_target IN ('hub','events','polls','alliance','url')),
  tap_url text,
  scheduled_for timestamptz,
  recurrence_rule text,
  sent_at timestamptz,
  cancelled boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES public.member_accounts(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_messages_scheduled_idx ON public.push_messages(scheduled_for) WHERE sent_at IS NULL AND cancelled = false;

CREATE TABLE IF NOT EXISTS public.push_message_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.push_messages(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
  delivered_at timestamptz,
  opened_at timestamptz,
  error text,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_deliveries_message_idx ON public.push_message_deliveries(message_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_message_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subs_own_select ON public.push_subscriptions FOR SELECT TO authenticated
  USING (account_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
CREATE POLICY push_subs_own_insert ON public.push_subscriptions FOR INSERT TO authenticated
  WITH CHECK (account_id = (SELECT auth.uid()));
CREATE POLICY push_subs_own_update ON public.push_subscriptions FOR UPDATE TO authenticated
  USING (account_id = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (account_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));
CREATE POLICY push_subs_own_delete ON public.push_subscriptions FOR DELETE TO authenticated
  USING (account_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE POLICY push_msgs_select ON public.push_messages FOR SELECT USING (true);
CREATE POLICY push_msgs_admin_insert ON public.push_messages FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY push_msgs_admin_update ON public.push_messages FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
CREATE POLICY push_msgs_admin_delete ON public.push_messages FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

CREATE POLICY push_deliveries_admin_select ON public.push_message_deliveries FOR SELECT TO authenticated
  USING ((SELECT public.is_admin()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_messages TO authenticated;
GRANT SELECT ON public.push_message_deliveries TO authenticated;
GRANT SELECT ON public.push_messages TO anon;
