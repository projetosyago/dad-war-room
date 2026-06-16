import { supabase } from '../lib/supabase'
import type { TroopTier } from '../types/domain'
import type { TablesInsert, TablesUpdate } from '../types/database/supabase'
import { mapTroopTier } from './mappers'

export async function listTroopTiers(): Promise<TroopTier[]> {
  const { data, error } = await supabase
    .from('troop_tiers')
    .select('*')
    .order('display_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(mapTroopTier)
}

export async function createTroopTier(
  input: TablesInsert<'troop_tiers'>,
): Promise<TroopTier> {
  const { data, error } = await supabase
    .from('troop_tiers')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return mapTroopTier(data)
}

export async function updateTroopTier(
  id: string,
  patch: TablesUpdate<'troop_tiers'>,
): Promise<TroopTier> {
  const { data, error } = await supabase
    .from('troop_tiers')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapTroopTier(data)
}

export async function deleteTroopTier(id: string): Promise<void> {
  const { error } = await supabase.from('troop_tiers').delete().eq('id', id)
  if (error) throw error
}
