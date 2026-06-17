import { useCallback, useEffect, useState } from 'react'
import { listPets } from '../repositories/pets'
import type { Pet } from '../types/domain'

export function usePets(opts: { includeInactive?: boolean } = {}) {
  const { includeInactive } = opts
  const [items, setItems] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listPets({ includeInactive })
      setItems(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [includeInactive])

  // Initial load on mount — async fetch pattern, not a render-loop. The new
  // react-hooks/set-state-in-effect rule doesn't model this case yet.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch()
  }, [refetch])

  return { items, loading, error, refetch }
}
