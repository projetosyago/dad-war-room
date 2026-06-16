import { supabase } from '../lib/supabase'
import type { Pet } from '../types/domain'
import type { TablesInsert, TablesUpdate } from '../types/database/supabase'
import { mapPet } from './mappers'

export interface ListPetsOpts {
  includeInactive?: boolean
}

export async function listPets(opts: ListPetsOpts = {}): Promise<Pet[]> {
  let q = supabase
    .from('pets')
    .select('*')
    .order('display_order', { ascending: true })
  if (!opts.includeInactive) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapPet)
}

export async function createPet(input: TablesInsert<'pets'>): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return mapPet(data)
}

export async function updatePet(
  id: string,
  patch: TablesUpdate<'pets'>,
): Promise<Pet> {
  const { data, error } = await supabase
    .from('pets')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapPet(data)
}

export async function deletePet(id: string): Promise<void> {
  const { error } = await supabase.from('pets').delete().eq('id', id)
  if (error) throw error
}
