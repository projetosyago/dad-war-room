import { supabase } from '../lib/supabase'
import type { AccountRole, MemberAccount } from '../types/domain'
import { mapMemberAccount } from './mappers'

/**
 * Account repository — single entry point for everything that touches
 * public.member_accounts and the related Edge Functions.
 *
 * The two list helpers exist as a guard against the most common "forget to
 * filter allies" bug (see PLANNING.md "Ally accounts"):
 *
 *   - listDadMembers()  → use this for KPIs, leaderboards, anything "DAD"
 *   - listAllAccounts() → admin-only, includes everyone
 */

export interface CreateAccountInput {
  username: string
  password: string
  role: AccountRole
  displayName?: string
  languageCode?: string
}

export async function listAllAccounts(): Promise<MemberAccount[]> {
  const { data, error } = await supabase
    .from('member_accounts')
    .select('*')
    .order('display_name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapMemberAccount)
}

/** Excludes allies — what to use for member counts, KPIs, leaderboards. */
export async function listDadMembers(): Promise<MemberAccount[]> {
  const { data, error } = await supabase
    .from('member_accounts')
    .select('*')
    .neq('role', 'ally')
    .eq('active', true)
    .order('display_name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapMemberAccount)
}

export async function listAllies(): Promise<MemberAccount[]> {
  const { data, error } = await supabase
    .from('member_accounts')
    .select('*')
    .eq('role', 'ally')
    .order('display_name', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapMemberAccount)
}

/**
 * Extract a friendly error message from a Functions response.
 *
 * supabase-js v2 reports HTTP errors via `FunctionsHttpError` where `context`
 * is the raw `Response` object — you have to read its body yourself. For 2xx
 * responses that still carry an `{ error: "..." }` body (which our functions
 * use defensively), we also peek at `data`.
 */
async function extractFunctionError(
  data: unknown,
  error: unknown,
): Promise<string | null> {
  if (error) {
    const ctx = (error as { context?: unknown }).context
    // FunctionsHttpError carries the raw Response in .context — clone + read it.
    if (
      ctx &&
      typeof ctx === 'object' &&
      'clone' in ctx &&
      typeof (ctx as Response).clone === 'function'
    ) {
      try {
        const text = await (ctx as Response).clone().text()
        if (text) {
          try {
            const parsed = JSON.parse(text) as { error?: string }
            if (typeof parsed?.error === 'string' && parsed.error.length > 0) {
              return parsed.error
            }
          } catch {
            // body is not JSON — return raw text as-is.
            return text
          }
        }
      } catch {
        /* fall through to message */
      }
    }
    return (error as Error).message ?? 'Edge Function call failed'
  }
  if (
    data &&
    typeof data === 'object' &&
    'error' in data &&
    typeof (data as { error: unknown }).error === 'string'
  ) {
    return (data as { error: string }).error
  }
  return null
}

/** Calls the `create-account` Edge Function (server-side, requires r4/r5). */
export async function createAccount(input: CreateAccountInput): Promise<MemberAccount> {
  const { data, error } = await supabase.functions.invoke<{ account: unknown; error?: string }>(
    'create-account',
    { body: input },
  )
  const errMsg = await extractFunctionError(data, error)
  if (errMsg) throw new Error(errMsg)
  if (!data || !('account' in data) || !data.account) {
    throw new Error('Edge Function returned no account')
  }
  return mapMemberAccount(data.account as Parameters<typeof mapMemberAccount>[0])
}

/** Shortcut for the "2 fields only" ally creation flow Salles specced. */
export async function createAllyAccount(
  username: string,
  password: string,
): Promise<MemberAccount> {
  return createAccount({ username, password, role: 'ally' })
}

/** Calls the `reset-password` Edge Function. */
export async function resetAccountPassword(
  accountId: string,
  newPassword: string,
): Promise<void> {
  const { data, error } = await supabase.functions.invoke('reset-password', {
    body: { accountId, newPassword },
  })
  const errMsg = await extractFunctionError(data, error)
  if (errMsg) throw new Error(errMsg)
}

/** Admin can deactivate/reactivate an account via direct UPDATE (RLS allows it). */
export async function setAccountActive(accountId: string, active: boolean): Promise<void> {
  const { error } = await supabase
    .from('member_accounts')
    .update({ active })
    .eq('id', accountId)
  if (error) throw error
}

/**
 * Self-service profile update. RLS allows any signed-in account to update
 * its own row (PLANNING.md §1quater). Pass only the fields you actually want
 * to change.
 */
export interface UpdateMyProfileInput {
  displayName?: string
  languageCode?: string
  avatarImageUrl?: string | null
  avatarHeroSlug?: string | null
}

export async function updateMyProfile(
  accountId: string,
  input: UpdateMyProfileInput,
): Promise<void> {
  // Typed payload — Supabase's generated update<T> rejects Record<string, unknown>.
  const patch: {
    display_name?: string
    language_code?: string
    avatar_image_url?: string | null
    avatar_hero_slug?: string | null
  } = {}
  if (input.displayName !== undefined) patch.display_name = input.displayName
  if (input.languageCode !== undefined) patch.language_code = input.languageCode
  if (input.avatarImageUrl !== undefined) patch.avatar_image_url = input.avatarImageUrl
  if (input.avatarHeroSlug !== undefined) patch.avatar_hero_slug = input.avatarHeroSlug
  if (Object.keys(patch).length === 0) return
  const { error } = await supabase
    .from('member_accounts')
    .update(patch)
    .eq('id', accountId)
  if (error) throw error
}

/** Self-service password change — goes through Supabase Auth. */
export async function changeMyPassword(newPassword: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/** PWA install bookkeeping — stamps `pwa_installed_at` once the user installs. */
export async function markPwaInstalled(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('member_accounts')
    .update({ pwa_installed_at: new Date().toISOString() })
    .eq('id', accountId)
  if (error) throw error
}
