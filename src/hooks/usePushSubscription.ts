import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getCurrentSubscription,
  isPushSupported,
  subscribePush,
  unsubscribePush,
} from '../lib/push'
import {
  removeSubscription,
  upsertSubscription,
} from '../repositories/pushSubscriptions'
import { useAuth } from './useAuth'

type Permission = NotificationPermission

interface PushHookState {
  /** Browser-level permission. 'default' means we haven't asked yet. */
  permission: Permission
  /** True when a PushSubscription exists in this browser. */
  subscribed: boolean
  /** True while we're talking to the SW / DB. */
  loading: boolean
  /** True when the browser doesn't expose Service Worker + PushManager. */
  supported: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
}

/**
 * React wrapper around `src/lib/push.ts` + the push_subscriptions repo.
 *
 * Owns three pieces of state:
 *   - `permission`  → mirrors `Notification.permission` for UI gating
 *   - `subscribed`  → true if reg.pushManager.getSubscription() returns a sub
 *   - `loading`     → blocks double-clicks during subscribe / unsubscribe
 *
 * subscribe(): asks for permission, generates a PushSubscription, persists it
 * for the current account with i18n.language and navigator.userAgent.
 *
 * unsubscribe(): tears down the SW sub, then removes the row from the DB so
 * the edge function stops targeting this endpoint.
 *
 * Both flows are no-ops when the browser doesn't support push or when the
 * user is signed out (subscriptions are tied to an account_id).
 */
export function usePushSubscription(): PushHookState {
  const { account } = useAuth()
  const { i18n } = useTranslation()
  const supported = typeof window === 'undefined' ? false : isPushSupported()

  const [permission, setPermission] = useState<Permission>(() =>
    supported && typeof Notification !== 'undefined'
      ? Notification.permission
      : 'default',
  )
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  // Detect existing subscription on mount (e.g. user installed PWA earlier).
  useEffect(() => {
    let cancelled = false
    if (!supported) return
    void (async () => {
      const sub = await getCurrentSubscription()
      if (!cancelled) setSubscribed(Boolean(sub))
    })()
    return () => {
      cancelled = true
    }
  }, [supported])

  const subscribe = useCallback(async () => {
    if (!supported) return
    if (!account?.id) {
      throw new Error('Sign in before enabling push notifications.')
    }
    setLoading(true)
    try {
      const sub = await subscribePush()
      setPermission(
        typeof Notification !== 'undefined' ? Notification.permission : 'granted',
      )
      const userAgent =
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      await upsertSubscription(account.id, sub, i18n.language, userAgent)
      setSubscribed(true)
    } finally {
      setLoading(false)
    }
  }, [account?.id, i18n.language, supported])

  const unsubscribe = useCallback(async () => {
    if (!supported) return
    setLoading(true)
    try {
      // Grab the endpoint BEFORE unsubscribe() invalidates it — we need it as
      // the natural key for the DB delete.
      const current = await getCurrentSubscription()
      await unsubscribePush()
      if (current?.endpoint) {
        await removeSubscription(current.endpoint)
      }
      setSubscribed(false)
    } finally {
      setLoading(false)
    }
  }, [supported])

  return {
    permission,
    subscribed,
    loading,
    supported,
    subscribe,
    unsubscribe,
  }
}
