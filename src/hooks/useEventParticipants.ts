import { useCallback, useEffect, useState } from 'react'
import {
  listForOccurrence,
  type ParticipantWithMember,
} from '../repositories/eventParticipants'

export interface UseEventParticipantsState {
  items: ParticipantWithMember[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Loads the participants of a single occurrence with member details
 * (nick/rank/power) for the admin squad editor. Re-fetches on demand
 * via `refetch()` after add/update/remove mutations.
 */
export function useEventParticipants(occurrenceId: string | undefined): UseEventParticipantsState {
  const [items, setItems] = useState<ParticipantWithMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    if (!occurrenceId) return
    try {
      setLoading(true)
      setError(null)
      const data = await listForOccurrence(occurrenceId)
      setItems(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [occurrenceId])

  useEffect(() => {
    let alive = true
    if (!occurrenceId) {
      setItems([])
      setLoading(false)
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await listForOccurrence(occurrenceId)
        if (alive) setItems(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [occurrenceId])

  return { items, loading, error, refetch }
}
