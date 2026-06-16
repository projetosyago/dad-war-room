import { supabase } from '../lib/supabase'

/**
 * Notifications repository — push_messages persistence + send-push trigger.
 *
 * NOTE: `public.push_messages` and `public.push_message_deliveries` were added
 * in Fase 6 of the schema rollout and are NOT yet present in the generated
 * `src/types/database/supabase.ts`. Until the typegen is refreshed, we go
 * through a thin `supabaseUntyped` cast for these two tables. Every value
 * crossing that boundary is typed explicitly in this file so the rest of the
 * codebase stays strict.
 */

// Cast the typed client to an untyped variant ONLY for tables not yet in the
// generated Database type. Limited to push_messages / push_message_deliveries
// access inside this file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseUntyped = supabase as unknown as any

export type PushAudience = 'all' | 'voting' | 'admins' | 'allies' | 'custom'
export type PushTapTarget = 'hub' | 'events' | 'polls' | 'alliance' | 'url'

export interface CreatePushMessageInput {
  title: string
  body: string
  emoji?: string | null
  imageUrl?: string | null
  audience: PushAudience
  customAccountIds?: string[] | null
  tapTarget: PushTapTarget
  tapUrl?: string | null
  scheduledFor?: string | null
  recurrenceRule?: string | null
  createdBy: string
}

export interface PushMessage {
  id: string
  title: string
  body: string
  emoji: string | null
  imageUrl: string | null
  audience: PushAudience
  customAccountIds: string[] | null
  tapTarget: PushTapTarget
  tapUrl: string | null
  scheduledFor: string | null
  recurrenceRule: string | null
  sentAt: string | null
  cancelled: boolean
  createdBy: string | null
  createdAt: string
}

export interface PushMessageSummary extends PushMessage {
  /** Count of deliveries where delivered_at IS NOT NULL. */
  delivered: number
  /** Count of deliveries where opened_at IS NOT NULL. */
  opened: number
}

/** Shape of a row coming back from `public.push_messages` (snake_case). */
interface PushMessageRow {
  id: string
  title: string
  body: string
  emoji: string | null
  image_url: string | null
  audience: PushAudience
  custom_account_ids: string[] | null
  tap_target: PushTapTarget
  tap_url: string | null
  scheduled_for: string | null
  recurrence_rule: string | null
  sent_at: string | null
  cancelled: boolean
  created_by: string | null
  created_at: string
}

interface DeliveryCountRow {
  message_id: string
  delivered_at: string | null
  opened_at: string | null
}

function mapPushMessage(row: PushMessageRow): PushMessage {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    emoji: row.emoji,
    imageUrl: row.image_url,
    audience: row.audience,
    customAccountIds: row.custom_account_ids,
    tapTarget: row.tap_target,
    tapUrl: row.tap_url,
    scheduledFor: row.scheduled_for,
    recurrenceRule: row.recurrence_rule,
    sentAt: row.sent_at,
    cancelled: row.cancelled,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }
}

/**
 * Insert a row in `public.push_messages`. The Edge Function `send-push` is
 * what actually fans out per-subscription deliveries — this call just records
 * the admin's intent. Callers that want immediate delivery should invoke
 * {@link sendPushImmediately} right after.
 */
export async function createPushMessage(
  input: CreatePushMessageInput,
): Promise<PushMessage> {
  const insertRow = {
    title: input.title,
    body: input.body,
    emoji: input.emoji ?? null,
    image_url: input.imageUrl ?? null,
    audience: input.audience,
    custom_account_ids:
      input.audience === 'custom' && input.customAccountIds?.length
        ? input.customAccountIds
        : null,
    tap_target: input.tapTarget,
    tap_url: input.tapTarget === 'url' ? input.tapUrl ?? null : null,
    scheduled_for: input.scheduledFor ?? null,
    recurrence_rule: input.recurrenceRule ?? null,
    created_by: input.createdBy,
  }

  const { data, error } = await supabaseUntyped
    .from('push_messages')
    .insert(insertRow)
    .select('*')
    .single()
  if (error) throw error as Error
  return mapPushMessage(data as PushMessageRow)
}

/**
 * Returns the most recent push messages with aggregated delivery / open
 * counts. We do this in two SELECTs and aggregate in JS — keeps things
 * simple while there's no SQL view yet, and the message volume stays
 * small enough that one round-trip per page is fine.
 */
export async function listRecentPushMessages(
  limit = 20,
): Promise<PushMessageSummary[]> {
  const { data: messageRows, error: msgErr } = await supabaseUntyped
    .from('push_messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (msgErr) throw msgErr as Error

  const rows = (messageRows ?? []) as PushMessageRow[]
  if (rows.length === 0) return []

  const messageIds = rows.map((r) => r.id)
  const { data: deliveryRows, error: delErr } = await supabaseUntyped
    .from('push_message_deliveries')
    .select('message_id, delivered_at, opened_at')
    .in('message_id', messageIds)
  if (delErr) throw delErr as Error

  const counts = new Map<string, { delivered: number; opened: number }>()
  for (const id of messageIds) counts.set(id, { delivered: 0, opened: 0 })
  for (const d of (deliveryRows ?? []) as DeliveryCountRow[]) {
    const bucket = counts.get(d.message_id)
    if (!bucket) continue
    if (d.delivered_at) bucket.delivered += 1
    if (d.opened_at) bucket.opened += 1
  }

  return rows.map((row) => {
    const c = counts.get(row.id) ?? { delivered: 0, opened: 0 }
    return { ...mapPushMessage(row), delivered: c.delivered, opened: c.opened }
  })
}

/**
 * Asks the `send-push` Edge Function to process a single message right now.
 * Throws if the function returns a non-2xx (the function itself decides
 * whether to enqueue or send synchronously).
 */
export async function sendPushImmediately(messageId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('send-push', {
    body: { message_id: messageId },
  })
  if (error) throw error
}
