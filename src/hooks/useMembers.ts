import { useEffect, useState } from 'react'
import { listMembers, listAllMembers } from '../repositories/members'
import type { Member } from '../types/domain'

export interface UseMembersState {
  members: Member[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Active + temporary_out members in canonical roster order.
 * For admin views that need to see 'left' members too, pass includeLeft.
 */
export function useMembers(includeLeft = false): UseMembersState {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = includeLeft ? await listAllMembers() : await listMembers()
      setMembers(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = includeLeft ? await listAllMembers() : await listMembers()
        if (alive) setMembers(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [includeLeft])

  return { members, loading, error, refetch: fetch }
}
