import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  getCurrentAccount,
  signInWithPassword as repoSignIn,
  signInWithUsername as repoSignInUsername,
  signOut as repoSignOut,
  usernameToEmail,
} from '../repositories/auth'
import { recordLoginEvent } from '../repositories/loginEvents'
import type { AccountRole, AuthState } from '../types/domain'

/** Safe accessor for the browser user agent (avoids SSR/test crashes). */
function currentUserAgent(): string | undefined {
  if (typeof navigator === 'undefined') return undefined
  return navigator.userAgent
}

const SIGNED_OUT: AuthState = {
  status: 'signed-out',
  user: null,
  account: null,
  role: null,
  isAdmin: false,
  isVotingMember: false,
  isAlly: false,
}

function deriveFlags(role: AccountRole | null) {
  return {
    isAdmin: role === 'r4' || role === 'r5',
    isVotingMember:
      role === 'member' ||
      role === 'r2' ||
      role === 'r3' ||
      role === 'r4' ||
      role === 'r5',
    isAlly: role === 'ally',
  }
}

/**
 * Single source of truth for auth state. Reads the Supabase session AND the
 * member_accounts row tied to that user (role, displayName, language…).
 *
 * `signIn` accepts either a raw email or just a username — we map the bare
 * username to its synthetic email (`salles` → `salles@dad-war-room.local`)
 * inside the repo. The boolean flags (isAdmin / isVotingMember / isAlly) are
 * derived from `account.role` so consumers never switch on the enum.
 */
export function useAuth(): AuthState & {
  signIn: (usernameOrEmail: string, password: string) => Promise<void>
  signInWithUsername: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  /** Force a fresh fetch of the account row (useful after profile edits). */
  refresh: () => Promise<void>
} {
  const [state, setState] = useState<AuthState>({
    ...SIGNED_OUT,
    status: 'loading',
  })

  const refresh = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setState(SIGNED_OUT)
        return
      }
      const account = await getCurrentAccount()
      const role: AccountRole | null = account?.role ?? null
      setState({
        status: 'signed-in',
        user: { id: user.id, email: user.email ?? '' },
        account,
        role,
        ...deriveFlags(role),
      })
    } catch {
      setState(SIGNED_OUT)
    }
  }, [])

  // Initial load on mount + auth subscription — async fetch pattern, not a
  // render-loop. The new react-hooks/set-state-in-effect rule doesn't model this.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!alive) return
        if (!user) {
          setState(SIGNED_OUT)
          return
        }
        const account = await getCurrentAccount()
        if (!alive) return
        const role: AccountRole | null = account?.role ?? null
        setState({
          status: 'signed-in',
          user: { id: user.id, email: user.email ?? '' },
          account,
          role,
          ...deriveFlags(role),
        })
      } catch {
        if (alive) setState(SIGNED_OUT)
      }
    })()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (alive) refresh()
    })
    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [refresh])

  const signIn = useCallback(async (usernameOrEmail: string, password: string) => {
    // Accept either form; usernameToEmail passes through full emails unchanged.
    const email = usernameToEmail(usernameOrEmail)
    try {
      await repoSignIn(email, password)
    } catch (err) {
      // Telemetry — failed signin attempts feed AdminAnalytics. Never blocks.
      void recordLoginEvent('failed_signin', undefined, currentUserAgent())
      throw err
    }
    await refresh()
    // Re-read the account so we have the canonical id to stamp last_login_at on.
    const account = await getCurrentAccount()
    if (account?.id) {
      void recordLoginEvent('signin', account.id, currentUserAgent())
    }
  }, [refresh])

  const signInWithUsername = useCallback(async (username: string, password: string) => {
    try {
      await repoSignInUsername(username, password)
    } catch (err) {
      void recordLoginEvent('failed_signin', undefined, currentUserAgent())
      throw err
    }
    await refresh()
    const account = await getCurrentAccount()
    if (account?.id) {
      void recordLoginEvent('signin', account.id, currentUserAgent())
    }
  }, [refresh])

  const signOut = useCallback(async () => {
    // Capture the account id BEFORE the session is torn down — once signOut
    // resolves, getCurrentAccount() would come back null.
    const accountId = state.account?.id
    await repoSignOut()
    if (accountId) {
      void recordLoginEvent('signout', accountId, currentUserAgent())
    }
    await refresh()
  }, [refresh, state.account?.id])

  return { ...state, signIn, signInWithUsername, signOut, refresh }
}
