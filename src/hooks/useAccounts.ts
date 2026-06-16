import { useEffect, useState } from 'react'
import { listAllAccounts } from '../repositories/accounts'
import type { MemberAccount } from '../types/domain'

export interface UseAccountsState {
  accounts: MemberAccount[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Lists ALL accounts (members + allies) for the admin Accounts page.
 * For DAD-only listings (KPIs, leaderboards) use {@link listDadMembers} instead.
 */
export function useAccounts(): UseAccountsState {
  const [accounts, setAccounts] = useState<MemberAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listAllAccounts()
      setAccounts(data)
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
        const data = await listAllAccounts()
        if (alive) setAccounts(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return { accounts, loading, error, refetch: fetch }
}
