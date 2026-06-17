-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615040409
-- Original name: audit_move_security_definer_to_private_schema
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- ═══════════════════════════════════════════════════════════════════
-- Audit fix · 2026-06-15
-- Move SECURITY DEFINER helpers out of the API-exposed `public` schema
-- so signed-in users can no longer call them via /rest/v1/rpc/<name>.
-- RLS policies can still reference them by fully-qualified name.
-- Resolves Supabase advisor: authenticated_security_definer_function_executable
-- ═══════════════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO service_role;

-- Re-create each helper in `private` schema. They keep SECURITY DEFINER so
-- they can read member_accounts regardless of caller role (used in RLS).
CREATE OR REPLACE FUNCTION private.account_role()
RETURNS public.account_role
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.member_accounts
  WHERE id = (SELECT auth.uid()) AND active
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_accounts
    WHERE id = (SELECT auth.uid()) AND active AND role IN ('r4', 'r5')
  )
$$;

CREATE OR REPLACE FUNCTION private.is_voting_member()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_accounts
    WHERE id = (SELECT auth.uid()) AND active AND role IN ('member', 'r2', 'r3', 'r4', 'r5')
  )
$$;

CREATE OR REPLACE FUNCTION private.is_ally()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_accounts
    WHERE id = (SELECT auth.uid()) AND active AND role = 'ally'
  )
$$;

-- Keep PUBLIC schema thin wrappers as SECURITY INVOKER for the rare case
-- frontend code still imports them — but they're harmless (RLS still applies).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$ SELECT private.is_admin() $$;

CREATE OR REPLACE FUNCTION public.is_voting_member()
RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$ SELECT private.is_voting_member() $$;

CREATE OR REPLACE FUNCTION public.is_ally()
RETURNS BOOLEAN
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$ SELECT private.is_ally() $$;

CREATE OR REPLACE FUNCTION public.account_role()
RETURNS public.account_role
LANGUAGE sql SECURITY INVOKER STABLE
SET search_path = ''
AS $$ SELECT private.account_role() $$;

GRANT EXECUTE ON FUNCTION public.is_admin()         TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_voting_member() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_ally()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.account_role()     TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin()         TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION private.is_voting_member() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION private.is_ally()          TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION private.account_role()     TO service_role, authenticated;
