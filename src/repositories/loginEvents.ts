import { supabase } from '../lib/supabase'

/**
 * Login telemetry event types — mirror the `login_event_type` enum in Postgres.
 * Only the subset we record from the client is exposed here.
 */
export type LoginEventType = 'signin' | 'signout' | 'failed_signin' | 'password_change'

/**
 * Fire-and-forget telemetry write. Calls the `public.record_login_event` RPC
 * (SECURITY DEFINER) which inserts into `login_events` and — on `signin` —
 * stamps `member_accounts.last_login_at` so AdminAnalytics reflects reality.
 *
 * Errors are swallowed by design: telemetry must NEVER block the login flow
 * or surface to the user. Failures are logged via `console.warn` so they
 * remain visible in dev tools without breaking the UX.
 */
export async function recordLoginEvent(
  eventType: LoginEventType,
  accountId?: string,
  userAgent?: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('record_login_event', {
      p_event_type: eventType,
      p_account_id: accountId ?? undefined,
      p_user_agent: userAgent ?? undefined,
    })
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[loginEvents] record_login_event failed', error.message)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[loginEvents] record_login_event threw', err)
  }
}
