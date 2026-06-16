import { supabase } from '../lib/supabase'

/**
 * Analytics repository — read-only aggregate queries over the telemetry
 * tables that power /admin/analytics.
 *
 * Wave 2 of the analytics rollout: replace the in-memory derivations on
 * AdminAnalytics.tsx with server-side counts against `login_events`
 * (signin / failed_signin) and `member_accounts.last_login_at`.
 *
 * Every helper here is read-only and safe to call in parallel from a
 * single Promise.all on mount. They use `head: true` so Postgres only
 * returns the row count, not row payloads.
 */

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 60 * MS_PER_MINUTE

/**
 * Distinct accounts that performed a `signin` event at or after `sinceIso`.
 * Backbone for "online now" (5-min window) and "active sessions" (24h).
 */
export async function countSigninsSince(sinceIso: string): Promise<number> {
  const { data, error } = await supabase
    .from('login_events')
    .select('account_id')
    .eq('event_type', 'signin')
    .gte('occurred_at', sinceIso)
    .not('account_id', 'is', null)
  if (error) throw error
  const unique = new Set<string>()
  for (const row of (data ?? []) as Array<{ account_id: string | null }>) {
    if (row.account_id) unique.add(row.account_id)
  }
  return unique.size
}

/**
 * Distinct accounts that signed in within the last `thresholdMinutes`.
 * Defaults to 5 min — what the UI labels "Online now".
 */
export async function countOnlineNow(thresholdMinutes = 5): Promise<number> {
  const sinceIso = new Date(Date.now() - thresholdMinutes * MS_PER_MINUTE).toISOString()
  return countSigninsSince(sinceIso)
}

/**
 * Distinct accounts with a signin in the last 24h. This is the closest
 * proxy we have to "active sessions" until a real presence channel lands.
 */
export async function countActiveSessions(): Promise<number> {
  const sinceIso = new Date(Date.now() - 24 * MS_PER_HOUR).toISOString()
  return countSigninsSince(sinceIso)
}

/**
 * Raw count of `failed_signin` events in the last 24h. Useful for
 * spotting credential-stuffing / brute force attempts at a glance.
 */
export async function countFailedSigninsLast24h(): Promise<number> {
  const sinceIso = new Date(Date.now() - 24 * MS_PER_HOUR).toISOString()
  const { count, error } = await supabase
    .from('login_events')
    .select('id', { count: 'exact', head: true })
    .eq('event_type', 'failed_signin')
    .gte('occurred_at', sinceIso)
  if (error) throw error
  return count ?? 0
}

/**
 * Accounts that have never logged in (last_login_at IS NULL).
 * Surfaces onboarding gaps — typically newly-created members who
 * haven't claimed their seed credentials yet.
 */
export async function countNeverLoggedIn(): Promise<number> {
  const { count, error } = await supabase
    .from('member_accounts')
    .select('id', { count: 'exact', head: true })
    .is('last_login_at', null)
  if (error) throw error
  return count ?? 0
}
