import { useEffect, useState } from 'react'
import { listEvents } from '../repositories/events'
import type { GameEvent, EventStatus } from '../types/domain'

export interface UseEventsState {
  events: GameEvent[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useEvents(statuses?: EventStatus[]): UseEventsState {
  const [events, setEvents] = useState<GameEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listEvents({ statuses })
      setEvents(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await listEvents({ statuses })
        if (alive) setEvents(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses?.join(',')])

  return { events, loading, error, refetch: fetch }
}
