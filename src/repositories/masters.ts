import { supabase } from '../lib/supabase'
import type { Master } from '../types/domain'
import type { TablesInsert, TablesUpdate } from '../types/database/supabase'
import { mapMaster } from './mappers'

export interface ListMastersOpts {
  /** Masters do not soft-delete the same way; defaults to all rows. */
  includeInactive?: boolean
}

export async function listMasters(opts: ListMastersOpts = {}): Promise<Master[]> {
  let q = supabase
    .from('masters')
    .select('*')
    .order('unlock_order', { ascending: true })
  if (opts.includeInactive === false) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapMaster)
}

export async function createMaster(input: TablesInsert<'masters'>): Promise<Master> {
  const { data, error } = await supabase
    .from('masters')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return mapMaster(data)
}

export async function updateMaster(
  id: string,
  patch: TablesUpdate<'masters'>,
): Promise<Master> {
  const { data, error } = await supabase
    .from('masters')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapMaster(data)
}

export async function deleteMaster(id: string): Promise<void> {
  const { error } = await supabase.from('masters').delete().eq('id', id)
  if (error) throw error
}
