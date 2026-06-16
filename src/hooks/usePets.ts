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

  useEffect(() => {
    refetch()
  }, [refetch])

  return { items, loading, error, refetch }
}
