import { useEffect, useState } from 'react'
import {
  getPollBySlug,
  getPollByShareToken,
  listPolls,
  listPollsPendingVote,
  type ListPollsOptions,
} from '../repositories/polls'
import type { Poll, PollWithDetails } from '../types/domain'

export interface UsePollsState {
  polls: Poll[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function usePolls(options?: ListPollsOptions): UsePollsState {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const key = `${options?.includeDrafts ? '1' : '0'}${options?.includeArchived ? '1' : '0'}`

  const fetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await listPolls(options)
      setPolls(data)
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
        const data = await listPolls(options)
        if (alive) setPolls(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { polls, loading, error, refetch: fetch }
}

export interface UsePendingPollsState {
  polls: Poll[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/** Polls the signed-in voting member still needs to weigh in on. Empty when ally. */
export function usePendingPolls(accountId: string | undefined | null, voting: boolean): UsePendingPollsState {
  const [polls, setPolls] = useState<Poll[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = async () => {
    if (!accountId || !voting) {
      setPolls([])
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      setError(null)
      const data = await listPollsPendingVote(accountId)
      setPolls(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load + reload on accountId/voting change — async fetch pattern,
  // not a render-loop. The new react-hooks/set-state-in-effect rule doesn't
  // model this case yet.
  useEffect(() => {
    let alive = true
    if (!accountId || !voting) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPolls([])
      setLoading(false)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await listPollsPendingVote(accountId)
        if (alive) setPolls(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [accountId, voting])

  return { polls, loading, error, refetch: fetch }
}

export interface UsePollState {
  poll: PollWithDetails | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function usePoll(slug: string | undefined): UsePollState {
  return usePollByLookup('slug', slug)
}

export function usePollByShareToken(token: string | undefined): UsePollState {
  return usePollByLookup('token', token)
}

function usePollByLookup(kind: 'slug' | 'token', value: string | undefined): UsePollState {
  const [poll, setPoll] = useState<PollWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const load = async () => {
    if (!value) return
    try {
      setLoading(true)
      setError(null)
      const data = kind === 'slug' ? await getPollBySlug(value) : await getPollByShareToken(value)
      setPoll(data)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }

  // Initial load + reload on value change — async fetch pattern, not a
  // render-loop. The new react-hooks/set-state-in-effect rule doesn't model
  // this case yet.
  useEffect(() => {
    if (!value) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setPoll(null)
      setLoading(false)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = kind === 'slug' ? await getPollBySlug(value) : await getPollByShareToken(value)
        if (alive) setPoll(data)
      } catch (e) {
        if (alive) setError(e as Error)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [kind, value])

  return { poll, loading, error, refetch: load }
}
