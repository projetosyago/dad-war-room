import { supabase } from '../lib/supabase'
import type { Hero } from '../types/domain'
import type { TablesInsert, TablesUpdate } from '../types/database/supabase'
import { mapHero } from './mappers'

/**
 * Catalogue repository — heroes table (public.heroes).
 * Admin CRUD lives here; the storefront/timeline reads via the same `listHeroes`.
 *
 * Filter rule: defaults to active-only so admin UIs can flip a checkbox to
 * include retired heroes when needed.
 */
export interface ListHeroesOpts {
  includeInactive?: boolean
}

export async function listHeroes(opts: ListHeroesOpts = {}): Promise<Hero[]> {
  let q = supabase
    .from('heroes')
    .select('*')
    .order('display_order', { ascending: true })
  if (!opts.includeInactive) q = q.eq('active', true)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapHero)
}

export async function createHero(input: TablesInsert<'heroes'>): Promise<Hero> {
  const { data, error } = await supabase
    .from('heroes')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return mapHero(data)
}

export async function updateHero(
  id: string,
  patch: TablesUpdate<'heroes'>,
): Promise<Hero> {
  const { data, error } = await supabase
    .from('heroes')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapHero(data)
}

export async function deleteHero(id: string): Promise<void> {
  const { error } = await supabase.from('heroes').delete().eq('id', id)
  if (error) throw error
}
