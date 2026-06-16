/**
 * Static roster — loaded from /data/members-roster.json at build time.
 * This is the bootstrap dataset for /members and /alliance pages while the
 * full Phase 8 Supabase tables haven't shipped yet.
 *
 * Once Phase 8 lands we'll replace these reads with `useMembers()` backed by
 * Supabase and bulk-import this JSON as the seed.
 */
import rosterJson from '../../data/members-roster.json'

export type MemberStatus = 'active' | 'temporary_out'
export type AllianceRank = 'R5' | 'R4' | 'R3' | 'R2' | 'R1'

export interface RosterMember {
  rank: AllianceRank
  subgroup?: string
  nick: string
  power_m: number
  tg_level?: number | null
  town_center_level?: number | null
  dad_tag?: 'prefix' | 'suffix'
  lang_hint?: string
  status?: MemberStatus
  status_note?: string
  note?: string
}

export interface RosterMeta {
  captured_at: string
  captured_by: string
  alliance: string
  kingdom: number
  server: string
  total_members_in_game: number
}

interface RosterFile {
  _meta: RosterMeta & Record<string, unknown>
  members: RosterMember[]
}

const roster = rosterJson as unknown as RosterFile

export const ROSTER_META: RosterMeta = {
  captured_at: roster._meta.captured_at,
  captured_by: roster._meta.captured_by,
  alliance: roster._meta.alliance,
  kingdom: roster._meta.kingdom,
  server: roster._meta.server,
  total_members_in_game: roster._meta.total_members_in_game,
}

export const ROSTER: RosterMember[] = roster.members

/**
 * Town Center level → highest troop tier (per Salles' spec, PLANNING.md §1).
 * TG players short-circuit: TG{n} town center = TG{n} troops.
 */
export function highestTroopTier(m: RosterMember): string {
  if (m.tg_level != null) return `TG${m.tg_level}`
  const lvl = m.town_center_level ?? 0
  if (lvl >= 30) return 'T10'
  if (lvl >= 26) return 'T9'
  if (lvl >= 22) return 'T8'
  if (lvl >= 19) return 'T7'
  if (lvl >= 16) return 'T6'
  if (lvl >= 13) return 'T5'
  if (lvl >= 11) return 'T4'
  if (lvl >= 7) return 'T3'
  if (lvl >= 4) return 'T2'
  if (lvl >= 1) return 'T1'
  return '—'
}

export function tierSortValue(tier: string): number {
  if (tier.startsWith('TG')) return 100 + parseInt(tier.slice(2)) // TG above T
  if (tier === '—') return -1
  return parseInt(tier.slice(1))
}

export function totalAlliancePowerM(roster: RosterMember[]): number {
  return roster.reduce((sum, m) => sum + m.power_m, 0)
}

/** Format power: 6647 → "6.65B"; 155.4 → "155.4M" */
export function formatPower(powerM: number): string {
  if (powerM >= 1000) return `${(powerM / 1000).toFixed(2)}B`
  if (powerM >= 1) return `${powerM.toFixed(1)}M`
  return `${(powerM * 1000).toFixed(0)}K`
}

export const RANK_LABEL: Record<AllianceRank, string> = {
  R5: 'R5 · Leader',
  R4: 'R4 · Officer',
  R3: 'R3 · Veteran',
  R2: 'R2 · Member',
  R1: 'R1 · Recruit',
}

export const RANK_ORDER: Record<AllianceRank, number> = {
  R5: 5, R4: 4, R3: 3, R2: 2, R1: 1,
}
