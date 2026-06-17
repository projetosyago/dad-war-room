-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616051634
-- Original name: record_login_event_anon_restrict
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


-- Defense in depth on the SECURITY DEFINER RPC: anon callers must be limited to
-- failed_signin telemetry with no account_id; authenticated callers retain full
-- access. The advisor still flags the function (because EXECUTE remains granted
-- to anon for legitimate failed-signin telemetry), but the attack surface is now
-- restricted to that single event type.
CREATE OR REPLACE FUNCTION public.record_login_event(
  p_event_type public.login_event_type,
  p_account_id uuid DEFAULT NULL::uuid,
  p_user_agent text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_caller uuid := (SELECT auth.uid());
BEGIN
  -- Anon callers (no auth.uid()) may only record failed_signin with no account_id
  IF v_caller IS NULL THEN
    IF p_event_type <> 'failed_signin' OR p_account_id IS NOT NULL THEN
      RAISE EXCEPTION 'anon callers may only record failed_signin events with no account_id'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Insert the telemetry row (always)
  INSERT INTO public.login_events (account_id, event_type, user_agent)
  VALUES (
    COALESCE(p_account_id, v_caller),
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
$function$;
