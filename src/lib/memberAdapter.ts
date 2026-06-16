import type { Member } from '../types/domain'
import type { RosterMember, AllianceRank as RosterRank } from '../data/roster'

/**
 * Adapter: DB `Member` (lowercase ranks, camelCase) → UI `RosterMember`
 * (uppercase ranks, snake_case). Lets us keep the existing MemberCard +
 * roster helpers (formatPower, highestTroopTier, etc) without rewriting
 * everything that consumes the static shape.
 */
const RANK_UP: Record<Member['rank'], RosterRank> = {
  r1: 'R1',
  r2: 'R2',
  r3: 'R3',
  r4: 'R4',
  r5: 'R5',
}

export function memberToRoster(m: Member): RosterMember {
  // RosterMember.dad_tag is narrowed to 'prefix' | 'suffix'.
  // Anything else (or null) → undefined.
  const dadTag =
    m.dadTag === 'prefix' || m.dadTag === 'suffix' ? m.dadTag : undefined

  return {
    rank: RANK_UP[m.rank],
    subgroup: m.subgroup ?? undefined,
    nick: m.nick,
    power_m: m.powerM,
    tg_level: m.tgLevel ?? undefined,
    town_center_level: m.townCenterLevel ?? undefined,
    dad_tag: dadTag,
    lang_hint: m.langHint ?? undefined,
    status: m.status === 'temporary_out' ? 'temporary_out' : undefined,
    status_note: m.statusNote ?? undefined,
    note: m.note ?? undefined,
  }
}

export function membersToRoster(members: Member[]): RosterMember[] {
  // 'left' members are excluded from the public view.
  return members.filter((m) => m.status !== 'left').map(memberToRoster)
}
