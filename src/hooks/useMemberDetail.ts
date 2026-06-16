import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mapMember } from '../repositories/mappers'
import { listSnapshotsForMember } from '../repositories/memberSnapshots'
import {
  listForMember as listParticipationsForMember,
  type MemberParticipationView,
} from '../repositories/eventParticipants'
import type { Member, MemberPowerSnapshot } from '../types/domain'

export interface UseMemberDetailState {
  member: Member | null
  snapshots: MemberPowerSnapshot[]
  participations: MemberParticipationView[]
  loading: boolean
  error: Error | null
}

/**
 * Loads everything `MemberDetail` needs in two stages:
 *   1. Find the member by nick (case-insensitive — URLs are typed casually).
 *   2. If found, fetch snapshots + participations in parallel.
 *
 * Returning `member: null` with `loading: false` is the "not found" state —
 * the page renders its 404 card on top of it. Errors only surface for actual
 * Supabase failures, not for missing members.
 */
export function useMemberDetail(nick: string): UseMemberDetailState {
  const [member, setMember] = useState<Member | null>(null)
  const [snapshots, setSnapshots] = useState<MemberPowerSnapshot[]>([])
  const [participations, setParticipations] = useState<MemberParticipationView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        setMember(null)
        setSnapshots([])
        setParticipations([])

        if (!nick) {
          if (alive) setLoading(false)
          return
        }

        const { data, error: memberError } = await supabase
          .from('members')
          .select('*')
          // Case-insensitive exact match — ilike with no wildcards behaves
          // like an `= LOWER(...) = LOWER(...)` comparison.
          .ilike('nick', nick)
          .maybeSingle()

        if (memberError) throw memberError
        if (!data) {
          if (alive) setLoading(false)
          return
        }

        const m = mapMember(data)
        if (!alive) return
        setMember(m)

        const [snaps, parts] = await Promise.all([
          listSnapshotsForMember(m.id),
          listParticipationsForMember(m.id),
        ])
        if (!alive) return
        setSnapshots(snaps)
        setParticipations(parts)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [nick])

  return { member, snapshots, participations, loading, error }
}
