-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615053721
-- Original name: grant_private_schema_usage_to_authenticated
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- Salles 2026-06-15: 403 across ALL admin writes (kingdom_milestones, polls,
-- poll_options, etc) because `public.is_admin()` is a SECURITY INVOKER wrapper
-- around `private.is_admin()`. The caller (role 'authenticated') needs USAGE
-- on the `private` schema to even resolve the function, even though the inner
-- function is SECURITY DEFINER.
--
-- Granting USAGE doesn't expose any objects (no SELECT/INSERT rights given);
-- it only allows pointing at function names that already have explicit EXECUTE
-- grants (which is_admin/is_voting_member/is_ally/account_role already have).

GRANT USAGE ON SCHEMA private TO authenticated;
-- 'anon' uses public.is_admin too in some "guest gate" wrappers — keep parity:
GRANT USAGE ON SCHEMA private TO anon;

-- Make sure future functions added to `private` inherit EXECUTE for authenticated
-- (mirrors the current explicit grants, prevents this footgun from coming back).
ALTER DEFAULT PRIVILEGES IN SCHEMA private
  GRANT EXECUTE ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private
  GRANT EXECUTE ON FUNCTIONS TO anon;
