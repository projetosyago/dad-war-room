import { useCallback, useEffect, useState } from 'react'
import {
  listRecentPushMessages,
  type PushMessageSummary,
} from '../repositories/notifications'

export interface UseRecentPushMessagesState {
  messages: PushMessageSummary[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Fetches the most recent push_messages with aggregated delivery / open
 * counts. Used by AdminNotifications to render the "Recent pushes" sidebar
 * and refreshes after a new message is sent.
 */
export function useRecentPushMessages(limit = 20): UseRecentPushMessagesState {
  const [messages, setMessages] = useState<PushMessageSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listRecentPushMessages(limit)
      setMessages(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await listRecentPushMessages(limit)
        if (alive) setMessages(data)
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

  return { messages, loading, error, refetch }
}
