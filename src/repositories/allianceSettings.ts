import { supabase } from '../lib/supabase'
import type { AllianceSettings } from '../types/domain'
import { mapAllianceSettings } from './mappers'

/**
 * Fetches the singleton row from public.alliance_settings.
 * Returns null if the seed somehow did not land (caller should fall back
 * to constants rather than crash).
 */
export async function getAllianceSettings(): Promise<AllianceSettings | null> {
  const { data, error } = await supabase
    .from('alliance_settings')
    .select('*')
    .eq('singleton', true)
    .maybeSingle()
  if (error) throw error
  return data ? mapAllianceSettings(data) : null
}

/**
 * Updates the singleton row. Typed patch (per WAR_ROOM_LOG §3 Lesson 9 —
 * Supabase rejects Record<string, unknown> for update payloads).
 *
 * Caller passes camelCase fields; we map to snake_case columns inline.
 */
export interface AllianceSettingsPatch {
  rank?: string | null
  motto?: string | null
  tagline?: string | null
  brandPrimary?: string | null
  brandAccent?: string | null
  capturedAt?: string | null
}

export async function updateAllianceSettings(
  patch: AllianceSettingsPatch,
): Promise<AllianceSettings> {
  const current = await getAllianceSettings()
  if (!current) throw new Error('alliance_settings singleton row is missing')

  const dbPatch: {
    rank?: string | null
    motto?: string | null
    tagline?: string | null
    brand_primary?: string | null
    brand_accent?: string | null
    captured_at?: string | null
    updated_at: string
  } = { updated_at: new Date().toISOString() }
  if (patch.rank !== undefined) dbPatch.rank = patch.rank
  if (patch.motto !== undefined) dbPatch.motto = patch.motto
  if (patch.tagline !== undefined) dbPatch.tagline = patch.tagline
  if (patch.brandPrimary !== undefined) dbPatch.brand_primary = patch.brandPrimary
  if (patch.brandAccent !== undefined) dbPatch.brand_accent = patch.brandAccent
  if (patch.capturedAt !== undefined) dbPatch.captured_at = patch.capturedAt

  const { data, error } = await supabase
    .from('alliance_settings')
    .update(dbPatch)
    .eq('id', current.id)
    .select('*')
    .single()
  if (error) throw error
  return mapAllianceSettings(data)
}
