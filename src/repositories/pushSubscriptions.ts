import { supabase } from '../lib/supabase'

/**
 * Repository for `public.push_subscriptions`.
 *
 * The Supabase generated types in `src/types/database/supabase.ts` are
 * regenerated only after every DDL migration; this table landed server-side
 * and the regen hasn't happened yet. To stay strictly typed at the call site,
 * we declare a local Insert/Update shape and route writes through a narrowly
 * cast Supabase client. Once types are regenerated this cast can be removed
 * with no API change to callers.
 *
 * Per WAR_ROOM_LOG §3 Lesson 9: update payloads are typed objects, never
 * `Record<string, unknown>`.
 */

// Local mirror of the columns we read/write — keeps payloads typed even though
// the generated Database type doesn't list this table yet.
interface PushSubscriptionRow {
  account_id: string | null
  endpoint: string
  p256dh: string
  auth_token: string
  language_code: string
  user_agent: string | null
  last_used_at: string | null
  active: boolean
}

type PushSubscriptionInsert = Omit<
  PushSubscriptionRow,
  'last_used_at' | 'active'
> & {
  last_used_at?: string | null
  active?: boolean
}

type PushSubscriptionUpdate = Partial<PushSubscriptionRow>

// Narrow escape hatch: re-cast the typed client to one that accepts our local
// row shapes for this one table. Scoped to this file so the rest of the app
// keeps the strongly-typed Database surface.
type AnyTableClient = {
  from(table: 'push_subscriptions'): {
    upsert(
      values: PushSubscriptionInsert,
      options?: { onConflict?: string },
    ): Promise<{ error: { message: string } | null }>
    update(
      values: PushSubscriptionUpdate,
    ): {
      eq(column: string, value: string): Promise<{ error: { message: string } | null }>
    }
    delete(): {
      eq(column: string, value: string): Promise<{ error: { message: string } | null }>
    }
  }
}

function pushClient(): AnyTableClient {
  return supabase as unknown as AnyTableClient
}

/**
 * Inserts (or refreshes) the subscription for this endpoint.
 *
 * UPSERT on the UNIQUE `endpoint` column so re-subscribing the same browser
 * is idempotent and re-activates rows that were marked inactive after a
 * previous unsubscribe.
 *
 * The PushSubscriptionJSON's `keys` are guaranteed by the web push spec
 * whenever a valid subscription is returned — we still null-guard so the
 * caller sees a clear error rather than a cryptic Postgres null violation.
 */
export async function upsertSubscription(
  accountId: string,
  sub: PushSubscriptionJSON,
  langCode: string,
  ua: string,
): Promise<void> {
  if (!sub.endpoint) throw new Error('PushSubscriptionJSON is missing endpoint')
  const p256dh = sub.keys?.p256dh
  const authToken = sub.keys?.auth
  if (!p256dh || !authToken) {
    throw new Error('PushSubscriptionJSON is missing required keys (p256dh/auth)')
  }

  const payload: PushSubscriptionInsert = {
    account_id: accountId,
    endpoint: sub.endpoint,
    p256dh,
    auth_token: authToken,
    language_code: langCode,
    user_agent: ua,
    last_used_at: new Date().toISOString(),
    active: true,
  }

  const { error } = await pushClient()
    .from('push_subscriptions')
    .upsert(payload, { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}

/**
 * Hard-deletes the row for an endpoint. Server-side cleanup (e.g. on 410 Gone)
 * also relies on endpoint as the natural key.
 */
export async function removeSubscription(endpoint: string): Promise<void> {
  const { error } = await pushClient()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
  if (error) throw new Error(error.message)
}

/**
 * Propagates the user's i18n language to every device they own so the
 * send-push edge function picks the right copy without per-device updates.
 */
export async function updateLanguage(
  accountId: string,
  langCode: string,
): Promise<void> {
  const patch: PushSubscriptionUpdate = { language_code: langCode }
  const { error } = await pushClient()
    .from('push_subscriptions')
    .update(patch)
    .eq('account_id', accountId)
  if (error) throw new Error(error.message)
}
