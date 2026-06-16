import { supabase } from '../lib/supabase'
import type { KingdomMilestone, MilestoneCategory } from '../types/domain'
import type { TablesInsert, TablesUpdate } from '../types/database/supabase'
import { mapMilestone } from './mappers'

export interface ListMilestonesOpts {
  categories?: MilestoneCategory[]
  achieved?: boolean
  /** When true, only milestones with a set unlock_date_utc */
  scheduledOnly?: boolean
}

export async function listMilestones(opts: ListMilestonesOpts = {}): Promise<KingdomMilestone[]> {
  let q = supabase.from('kingdom_milestones').select('*').order('display_order', { ascending: true })
  if (opts.categories?.length) q = q.in('category', opts.categories)
  if (opts.achieved !== undefined) q = q.eq('achieved', opts.achieved)
  if (opts.scheduledOnly) q = q.not('unlock_date_utc', 'is', null)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapMilestone)
}

/**
 * Milestones that are scheduled (unlock_date_utc set), not yet achieved,
 * and either in the future or in the past few days (so "happens today/yesterday"
 * still surfaces in the timeline card).
 */
export async function listUpcomingMilestones(opts?: { limit?: number }): Promise<KingdomMilestone[]> {
  const lookback = new Date()
  lookback.setDate(lookback.getDate() - 1)
  let q = supabase
    .from('kingdom_milestones')
    .select('*')
    .eq('achieved', false)
    .not('unlock_date_utc', 'is', null)
    .gte('unlock_date_utc', lookback.toISOString())
    .order('unlock_date_utc', { ascending: true })
  if (opts?.limit) q = q.limit(opts.limit)
  const { data, error } = await q
  if (error) throw error
  return (data ?? []).map(mapMilestone)
}

export async function createMilestone(input: TablesInsert<'kingdom_milestones'>): Promise<KingdomMilestone> {
  const { data, error } = await supabase
    .from('kingdom_milestones')
    .insert(input)
    .select('*')
    .single()
  if (error) throw error
  return mapMilestone(data)
}

export async function updateMilestone(
  id: string,
  patch: TablesUpdate<'kingdom_milestones'>,
): Promise<KingdomMilestone> {
  const { data, error } = await supabase
    .from('kingdom_milestones')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return mapMilestone(data)
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('kingdom_milestones').delete().eq('id', id)
  if (error) throw error
}

/** Single milestone for the public detail page (/timeline/:slug). */
export async function getMilestoneBySlug(slug: string): Promise<KingdomMilestone | null> {
  const { data, error } = await supabase
    .from('kingdom_milestones')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ? mapMilestone(data) : null
}
