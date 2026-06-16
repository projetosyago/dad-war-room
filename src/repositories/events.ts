import { supabase } from '../lib/supabase'
import type { GameEvent, EventStatus } from '../types/domain'
import type { TablesInsert, TablesUpdate } from '../types/database/supabase'
import { mapEvent } from './mappers'

export async function listEvents(opts?: { statuses?: EventStatus[] }): Promise<GameEvent[]> {
  let q = supabase.from('events').select('*').order('display_order', { ascending: true })
  if (opts?.statuses?.length) q = q.in('status', opts.statuses)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapEvent)
}

export async function getEventBySlug(slug: string): Promise<GameEvent | null> {
  const { data, error } = await supabase.from('events').select('*').eq('slug', slug).maybeSingle()
  if (error) throw error
  return data ? mapEvent(data) : null
}

export async function createEvent(input: TablesInsert<'events'>): Promise<GameEvent> {
  const { data, error } = await supabase.from('events').insert(input).select('*').single()
  if (error) throw error
  return mapEvent(data)
}

export async function updateEvent(
  id: string,
  patch: TablesUpdate<'events'>,
): Promise<GameEvent> {
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapEvent(data)
}

export async function archiveEvent(id: string): Promise<GameEvent> {
  return updateEvent(id, { status: 'archived', archived_at: new Date().toISOString() })
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id)
  if (error) throw error
}
