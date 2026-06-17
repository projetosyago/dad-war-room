-- Pulled from remote DB on 2026-06-16 (Wave 10 audit remediation)
-- Original version timestamp: 20260615012214
-- Original name: fase_b_disable_force_password_change
-- This migration was previously applied to the remote project (ilogsrlbenhdzkfgexvt)
-- but was missing from the local supabase/migrations/ directory.

-- Salles 2026-06-14: don't enforce password change after admin reset/create.
-- Keep the column (might use later) but default to false so the flag never
-- silently goes true. Reset any existing rows that were flagged.
ALTER TABLE public.member_accounts ALTER COLUMN password_temporary SET DEFAULT false;
UPDATE public.member_accounts SET password_temporary = false WHERE password_temporary = true;
