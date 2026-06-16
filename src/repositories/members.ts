import { supabase } from '../lib/supabase'
import type {
  AllianceRank,
  Member,
  MemberStatusValue,
  MemberSubgroup,
} from '../types/domain'
import { mapMember } from './mappers'

/**
 * Repository for the in-game alliance roster (public.members).
 * NOT for ally accounts — those are guests from other alliances and live in
 * member_accounts with role='ally', NO members row.
 *
 * Standard ordering: display_order ASC (preserves the original roster layout
 * that mirrors the in-game alliance window).
 */

export interface ListMembersOptions {
  /** Include members with status 'left' (default: false). */
  includeLeft?: boolean
  /** Include 'temporary_out' members (default: true — they're still DAD). */
  includeTemporaryOut?: boolean
}

export async function listMembers(options: ListMembersOptions = {}): Promise<Member[]> {
  const { includeLeft = false, includeTemporaryOut = true } = options
  const allowed: MemberStatusValue[] = ['active']
  if (includeTemporaryOut) allowed.push('temporary_out')
  if (includeLeft) allowed.push('left')

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .in('status', allowed)
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapMember)
}

export async function listAllMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data ?? []).map(mapMember)
}

export async function getMemberById(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? mapMember(data) : null
}

export interface UpdateMemberInput {
  nick?: string
  rank?: Member['rank']
  subgroup?: Member['subgroup']
  powerM?: number
  tgLevel?: number | null
  townCenterLevel?: number | null
  dadTag?: string | null
  tagPosition?: string | null
  status?: MemberStatusValue
  statusNote?: string | null
  langHint?: string | null
  note?: string | null
}

export async function updateMember(
  id: string,
  input: UpdateMemberInput,
): Promise<Member> {
  const patch: {
    nick?: string
    rank?: AllianceRank
    subgroup?: MemberSubgroup | null
    power_m?: number
    tg_level?: number | null
    town_center_level?: number | null
    dad_tag?: string | null
    tag_position?: string | null
    status?: MemberStatusValue
    status_note?: string | null
    lang_hint?: string | null
    note?: string | null
  } = {}
  if (input.nick !== undefined) patch.nick = input.nick
  if (input.rank !== undefined) patch.rank = input.rank
  if (input.subgroup !== undefined) patch.subgroup = input.subgroup
  if (input.powerM !== undefined) patch.power_m = input.powerM
  if (input.tgLevel !== undefined) patch.tg_level = input.tgLevel
  if (input.townCenterLevel !== undefined) patch.town_center_level = input.townCenterLevel
  if (input.dadTag !== undefined) patch.dad_tag = input.dadTag
  if (input.tagPosition !== undefined) patch.tag_position = input.tagPosition
  if (input.status !== undefined) patch.status = input.status
  if (input.statusNote !== undefined) patch.status_note = input.statusNote
  if (input.langHint !== undefined) patch.lang_hint = input.langHint
  if (input.note !== undefined) patch.note = input.note

  const { data, error } = await supabase
    .from('members')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return mapMember(data)
}

export interface CreateMemberInput {
  nick: string
  rank: Member['rank']
  subgroup?: Member['subgroup']
  powerM?: number
  tgLevel?: number | null
  townCenterLevel?: number | null
}

export async function createMember(input: CreateMemberInput): Promise<Member> {
  // Push new entries to the end of the display order by default.
  const { data: maxRow } = await supabase
    .from('members')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextOrder = (maxRow?.display_order ?? 0) + 1

  const { data, error } = await supabase
    .from('members')
    .insert({
      nick: input.nick,
      rank: input.rank,
      subgroup: input.subgroup ?? null,
      power_m: input.powerM ?? 0,
      tg_level: input.tgLevel ?? null,
      town_center_level: input.townCenterLevel ?? null,
      display_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw error
  return mapMember(data)
}

/** Set status to 'left' rather than DELETE — preserves history. */
export async function markMemberLeft(id: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ status: 'left' })
    .eq('id', id)
  if (error) throw error
}

/** Link a member_accounts row to a members row (for Salles' admin etc). */
export async function linkAccountToMember(
  accountId: string,
  memberId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('member_accounts')
    .update({ member_id: memberId })
    .eq('id', accountId)
  if (error) throw error
}
