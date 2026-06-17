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

  // Initial load on mount / option change — async fetch pattern, not a
  // render-loop. The new react-hooks/set-state-in-effect rule doesn't model this.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await listHeroes({ includeInactive })
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
  }, [includeInactive])

  return { items, loading, error, refetch }
}
