-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260616054716
-- Original name: login_events_account_nullable
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.


-- Make account_id nullable so anon failed_signin events can be recorded
ALTER TABLE public.login_events ALTER COLUMN account_id DROP NOT NULL;

-- Update RPC: for anon failed_signin, insert with account_id IS NULL
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
  v_account_id uuid;
BEGIN
  -- Anon callers (no auth.uid()) may only record failed_signin with no account_id
  IF v_caller IS NULL THEN
    IF p_event_type <> 'failed_signin' OR p_account_id IS NOT NULL THEN
      RAISE EXCEPTION 'anon callers may only record failed_signin events with no account_id'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- For anon failed_signin, account_id stays NULL.
  -- For authenticated events, use provided p_account_id or fall back to caller.
  IF v_caller IS NULL AND p_event_type = 'failed_signin' THEN
    v_account_id := NULL;
  ELSE
    v_account_id := COALESCE(p_account_id, v_caller);
  END IF;

  INSERT INTO public.login_events (account_id, event_type, user_agent)
  VALUES (v_account_id, p_event_type, p_user_agent);

  -- For signin, also stamp last_login_at on the account
  IF p_event_type = 'signin' AND p_account_id IS NOT NULL THEN
    UPDATE public.member_accounts
    SET last_login_at = NOW(),
        first_login_at = COALESCE(first_login_at, NOW())
    WHERE id = p_account_id;
  END IF;
END;
$function$;
