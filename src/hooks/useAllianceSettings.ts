import { useEffect, useState } from 'react'
import { getAllianceSettings } from '../repositories/allianceSettings'
import type { AllianceSettings } from '../types/domain'

export function useAllianceSettings() {
  const [settings, setSettings] = useState<AllianceSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllianceSettings()
      setSettings(data)
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

  return { settings, loading, error, refetch }
}
