import { useEffect, useState } from 'react'
import { listMilestones, listUpcomingMilestones } from '../repositories/milestones'
import type { KingdomMilestone } from '../types/domain'

export function useUpcomingMilestones(limit = 8) {
  const [milestones, setMilestones] = useState<KingdomMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await listUpcomingMilestones({ limit })
        if (alive) setMilestones(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [limit])

  return { milestones, loading, error }
}

export function useAllMilestones() {
  const [milestones, setMilestones] = useState<KingdomMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listMilestones()
      setMilestones(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load on mount — async fetch pattern, not a render-loop. The new
  // react-hooks/set-state-in-effect rule doesn't model this case yet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [])

  return { milestones, loading, error, refetch }
}
