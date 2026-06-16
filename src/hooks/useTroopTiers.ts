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

  useEffect(() => {
    refetch()
  }, [refetch])

  return { items, loading, error, refetch }
}
