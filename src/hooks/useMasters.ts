import { useCallback, useEffect, useState } from 'react'
import { listMasters } from '../repositories/masters'
import type { Master } from '../types/domain'

export function useMasters() {
  const [items, setItems] = useState<Master[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listMasters()
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
