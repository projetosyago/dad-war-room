import { useEffect, useState } from 'react'
import { addDays } from 'date-fns'
import { getNextOccurrence, listOccurrencesInRange } from '../repositories/occurrences'
import type { OccurrenceWithEvent } from '../types/domain'

export function useNextOccurrence() {
  const [occurrence, setOccurrence] = useState<OccurrenceWithEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getNextOccurrence()
        if (alive) setOccurrence(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return { occurrence, loading, error }
}

export function useUpcomingOccurrences(daysAhead = 7) {
  const [items, setItems] = useState<OccurrenceWithEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const from = new Date()
        const to = addDays(from, daysAhead)
        const data = await listOccurrencesInRange(from, to)
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
  }, [daysAhead])

  return { items, loading, error }
}
