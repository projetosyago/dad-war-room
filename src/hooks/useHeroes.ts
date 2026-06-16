import { useCallback, useEffect, useState } from 'react'
import { listHeroes } from '../repositories/heroes'
import type { Hero } from '../types/domain'

/**
 * Loads the heroes catalogue. Pass `includeInactive` true from admin screens so
 * retired heroes still show up in the management list.
 */
export function useHeroes(opts: { includeInactive?: boolean } = {}) {
  const { includeInactive } = opts
  const [items, setItems] = useState<Hero[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listHeroes({ includeInactive })
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
