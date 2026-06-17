import { useCallback, useEffect, useState } from 'react'
import { listTroopTiers } from '../repositories/troopTiers'
import type { TroopTier } from '../types/domain'

export function useTroopTiers() {
  const [items, setItems] = useState<TroopTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listTroopTiers()
      setItems(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load on mount — async fetch pattern, not a render-loop. The new
  // react-hooks/set-state-in-effect rule doesn't model this case yet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { items, loading, error, refetch }
}
