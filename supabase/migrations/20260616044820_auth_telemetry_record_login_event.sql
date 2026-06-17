-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616044820
-- Original name: auth_telemetry_record_login_event
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

CREATE OR REPLACE FUNCTION public.record_login_event(
  p_event_type public.login_event_type,
  p_account_id uuid DEFAULT NULL,
  p_user_agent text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Insert the telemetry row (always)
  INSERT INTO public.login_events (account_id, event_type, user_agent)
  VALUES (
    COALESCE(p_account_id, (SELECT auth.uid())),
    p_event_type,
    p_user_agent
  );
  -- For signin, also stamp last_login_at on the account
  IF p_event_type = 'signin' AND p_account_id IS NOT NULL THEN
    UPDATE public.member_accounts
    SET last_login_at = NOW(),
        first_login_at = COALESCE(first_login_at, NOW())
    WHERE id = p_account_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_login_event(public.login_event_type, uuid, text) TO anon, authenticated;
