import { supabase } from '../lib/supabase'
import type { AllianceRank, MemberStatusValue, ParticipationRole } from '../types/domain'

/**
 * Display row for a member's participation history. Flattens the
 * event_occurrences → events join so the UI doesn't have to know about
 * the relational structure.
 */
export interface MemberParticipationView {
  occurrenceId: string
  startsAtUtc: string
  eventName: string
  eventSlug: string
  role: ParticipationRole | null
  notes: string | null
}

/** Shape returned by the joined `select` — keeps the mapper honest. */
interface ParticipantRow {
  event_occurrence_id: string
  participation_role: string | null
  notes: string | null
  event_occurrence: {
    id: string
    starts_at_utc: string
    event: {
      slug: string
      name: string
    } | null
  } | null
}

/**
 * Lists every past participation for a member, joined with the occurrence
 * and parent event so the UI gets a single display-ready array. Ordered by
 * occurrence start DESC (most recent first) — the page groups by event name
 * for the summary card, but raw history order matters for tie-breaking.
 */
export async function listForMember(
  memberId: string,
): Promise<MemberParticipationView[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select(
      'event_occurrence_id, participation_role, notes, event_occurrence:event_occurrences(id, starts_at_utc, event:events(slug, name))',
    )
    .eq('member_id', memberId)
    .order('added_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as unknown as ParticipantRow[]
  return rows
    .filter((r) => r.event_occurrence && r.event_occurrence.event)
    .map((r) => ({
      occurrenceId: r.event_occurrence!.id,
      startsAtUtc: r.event_occurrence!.starts_at_utc,
      eventName: r.event_occurrence!.event!.name,
      eventSlug: r.event_occurrence!.event!.slug,
      role: (r.participation_role as ParticipationRole | null) ?? null,
      notes: r.notes,
    }))
    .sort((a, b) => b.startsAtUtc.localeCompare(a.startsAtUtc))
}

/**
 * Display row for the admin participants page — flattens the
 * event_participants ↔ members join so the UI gets nick/rank/power inline.
 */
export interface ParticipantWithMember {
  eventOccurrenceId: string
  memberId: string
  role: ParticipationRole | null
  notes: string | null
  addedAt: string
  member: {
    id: string
    nick: string
    rank: AllianceRank
    powerM: number
    tgLevel: number | null
    status: MemberStatusValue
  }
}

/** Shape of a row from the admin listForOccurrence join. */
interface OccurrenceParticipantRow {
  event_occurrence_id: string
  member_id: string
  participation_role: string | null
  notes: string | null
  added_at: string
  member: {
    id: string
    nick: string
    rank: string
    power_m: number
    tg_level: number | null
    status: string
  } | null
}

/**
 * Lists all participants for a specific occurrence, joined with member
 * details. Ordered by participation_role (leader → joiner → standby → null)
 * then by member nick alphabetically. The admin page renders rows directly
 * from this — no further fetches needed.
 */
export async function listForOccurrence(
  occurrenceId: string,
): Promise<ParticipantWithMember[]> {
  const { data, error } = await supabase
    .from('event_participants')
    .select(
      'event_occurrence_id, member_id, participation_role, notes, added_at, member:members(id, nick, rank, power_m, tg_level, status)',
    )
    .eq('event_occurrence_id', occurrenceId)
    .order('added_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as OccurrenceParticipantRow[]
  const ROLE_ORDER: Record<string, number> = { leader: 0, joiner: 1, standby: 2 }
  return rows
    .filter((r) => r.member)
    .map((r) => ({
      eventOccurrenceId: r.event_occurrence_id,
      memberId: r.member_id,
      role: (r.participation_role as ParticipationRole | null) ?? null,
      notes: r.notes,
      addedAt: r.added_at,
      member: {
        id: r.member!.id,
        nick: r.member!.nick,
        rank: r.member!.rank as AllianceRank,
        powerM: r.member!.power_m,
        tgLevel: r.member!.tg_level,
        status: r.member!.status as MemberStatusValue,
      },
    }))
    .sort((a, b) => {
      const ra = a.role ? (ROLE_ORDER[a.role] ?? 9) : 9
      const rb = b.role ? (ROLE_ORDER[b.role] ?? 9) : 9
      if (ra !== rb) return ra - rb
      return a.member.nick.localeCompare(b.member.nick)
    })
}

export interface AddParticipantInput {
  occurrenceId: string
  memberId: string
  role: ParticipationRole | null
  notes?: string | null
}

/**
 * Inserts a participant row. `added_by` is populated from the current auth
 * user — RLS requires admin role, so the caller already has a session.
 * Errors on duplicate (occurrenceId, memberId) — the composite PK enforces it.
 */
export async function addParticipant(input: AddParticipantInput): Promise<void> {
  const { data: userResp } = await supabase.auth.getUser()
  const { error } = await supabase.from('event_participants').insert({
    event_occurrence_id: input.occurrenceId,
    member_id: input.memberId,
    participation_role: input.role,
    notes: input.notes ?? null,
    added_by: userResp.user?.id ?? null,
  })
  if (error) throw error
}

export interface UpdateParticipantPatch {
  role?: ParticipationRole | null
  notes?: string | null
}

/**
 * Updates role and/or notes for an existing participant. No-op fields are
 * omitted from the payload so the UPDATE only touches what changed.
 */
export async function updateParticipant(
  occurrenceId: string,
  memberId: string,
  patch: UpdateParticipantPatch,
): Promise<void> {
  const update: { participation_role?: string | null; notes?: string | null } = {}
  if (patch.role !== undefined) update.participation_role = patch.role
  if (patch.notes !== undefined) update.notes = patch.notes
  if (Object.keys(update).length === 0) return
  const { error } = await supabase
    .from('event_participants')
    .update(update)
    .eq('event_occurrence_id', occurrenceId)
    .eq('member_id', memberId)
  if (error) throw error
}

/** Removes a participant from an occurrence. Admin-only via RLS. */
export async function removeParticipant(
  occurrenceId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase
    .from('event_participants')
    .delete()
    .eq('event_occurrence_id', occurrenceId)
    .eq('member_id', memberId)
  if (error) throw error
}
