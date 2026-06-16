import { supabase } from '../lib/supabase'
import type { EventOccurrence, OccurrenceWithEvent } from '../types/domain'
import type { TablesInsert, TablesUpdate } from '../types/database/supabase'
import { mapEvent, mapOccurrence } from './mappers'

/**
 * Returns occurrences whose start_time falls between [from, to] (UTC),
 * sorted ascending. Joins the parent event so the UI gets icon + name + accent.
 */
export async function listOccurrencesInRange(
  from: Date,
  to: Date,
  opts?: { includeCancelled?: boolean },
): Promise<OccurrenceWithEvent[]> {
  let q = supabase
    .from('event_occurrences')
    .select('*, event:events(*)')
    .gte('starts_at_utc', from.toISOString())
    .lte('starts_at_utc', to.toISOString())
    .order('starts_at_utc', { ascending: true })
  if (!opts?.includeCancelled) q = q.eq('cancelled', false)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map((row) => ({
    ...mapOccurrence(row),
    event: mapEvent(row.event as Parameters<typeof mapEvent>[0]),
  }))
}

/**
 * The single next non-cancelled occurrence whose start_time is after `now`.
 * Returns null when nothing is scheduled.
 */
export async function getNextOccurrence(now: Date = new Date()): Promise<OccurrenceWithEvent | null> {
  const { data, error } = await supabase
    .from('event_occurrences')
    .select('*, event:events(*)')
    .gt('starts_at_utc', now.toISOString())
    .eq('cancelled', false)
    .order('starts_at_utc', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return {
    ...mapOccurrence(data),
    event: mapEvent(data.event as Parameters<typeof mapEvent>[0]),
  }
}

export async function listOccurrencesForEvent(eventId: string): Promise<EventOccurrence[]> {
  const { data, error } = await supabase
    .from('event_occurrences')
    .select('*')
    .eq('event_id', eventId)
    .order('starts_at_utc', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapOccurrence)
}

export async function createOccurrence(input: TablesInsert<'event_occurrences'>): Promise<EventOccurrence> {
  const { data, error } = await supabase
    .from('event_occurrences')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return mapOccurrence(data)
}

/**
 * Bulk-create occurrences from a single seed date at a fixed interval — useful
 * for the "bear every 48h, next 10 hunts" pattern without needing a real
 * RRULE engine on the client.
 */
export async function createRecurringOccurrences(
  base: Omit<TablesInsert<'event_occurrences'>, 'starts_at_utc'>,
  firstStartUtc: Date,
  intervalHours: number,
  count: number,
): Promise<EventOccurrence[]> {
  const rows: TablesInsert<'event_occurrences'>[] = Array.from({ length: count }, (_, i) => ({
    ...base,
    starts_at_utc: new Date(firstStartUtc.getTime() + i * intervalHours * 3600 * 1000).toISOString(),
  }))
  const { data, error } = await supabase.from('event_occurrences').insert(rows).select('*')
  if (error) throw error
  return (data ?? []).map(mapOccurrence)
}

export async function updateOccurrence(
  id: string,
  patch: TablesUpdate<'event_occurrences'>,
): Promise<EventOccurrence> {
  const { data, error } = await supabase
    .from('event_occurrences')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapOccurrence(data)
}

export async function deleteOccurrence(id: string): Promise<void> {
  const { error } = await supabase.from('event_occurrences').delete().eq('id', id)
  if (error) throw error
}
