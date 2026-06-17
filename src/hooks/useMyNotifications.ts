import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

/**
 * Audience targeting matches what AdminNotifications.tsx writes to
 * `public.push_messages` AND what `supabase/functions/send-push/index.ts` expands
 * server-side. The voting roles list mirrors `audienceRoles()` in the edge
 * function — keep them in sync.
 */
export type PushAudience = 'all' | 'voting' | 'admins' | 'allies' | 'custom'
export type PushTapTarget = 'hub' | 'events' | 'polls' | 'alliance' | 'url'

export interface PushMessageRow {
  id: string
  title: string
  body: string
  emoji: string | null
  image_url: string | null
  audience: PushAudience
  custom_account_ids: string[] | null
  tap_target: PushTapTarget
  tap_url: string | null
  created_at: string
  /** When the edge function actually fired the message; null = still scheduled. */
  sent_at: string | null
  scheduled_for: string | null
  cancelled: boolean | null
}

const LAST_SEEN_KEY = 'war-room.last_seen_notification_at'
const MAX_MESSAGES = 20

function readLastSeen(): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_KEY)
    if (!raw) return 0
    const ts = Date.parse(raw)
    return Number.isFinite(ts) ? ts : 0
  } catch {
    return 0
  }
}

function writeLastSeen(iso: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, iso)
  } catch {
    // localStorage can throw in private-mode Safari — non-fatal, just lose state.
  }
}

export interface UseMyNotificationsState {
  messages: PushMessageRow[]
  unreadCount: number
  loading: boolean
  /** Stamps "now" into localStorage so unreadCount drops to 0 until the next message lands. */
  markAllAsSeen: () => void
}

/**
 * Fetches the 20 most-recent `public.push_messages` rows actually delivered
 * (sent_at IS NOT NULL, not cancelled) that target the signed-in user, based on
 * their account role:
 *
 *  - `all`     → everyone signed in
 *  - `voting`  → role in {member, r2, r3, r4, r5}
 *  - `admins`  → role in {r4, r5}
 *  - `allies`  → role = 'ally'
 *  - `custom`  → account.id ∈ custom_account_ids
 *
 * Unread count = number of messages whose `created_at` is newer than the
 * localStorage timestamp `war-room.last_seen_notification_at`. Calling
 * `markAllAsSeen()` writes the current time and zeroes the count.
 */
export function useMyNotifications(): UseMyNotificationsState {
  const { account, role } = useAuth()
  const accountId = account?.id ?? null

  const [messages, setMessages] = useState<PushMessageRow[]>([])
  const [loading, setLoading] = useState(false)
  const [lastSeenMs, setLastSeenMs] = useState<number>(() => readLastSeen())

  // Stable key so the effect re-runs when the role/account changes, but not on
  // every render of the consuming Header.
  const cacheKey = `${accountId ?? 'anon'}:${role ?? 'none'}`

  // Initial load + reload on accountId/cacheKey change — async fetch pattern,
  // not a render-loop. The new react-hooks/set-state-in-effect rule doesn't
  // model this case yet.
  useEffect(() => {
    if (!accountId) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setMessages([])
      setLoading(false)
      /* eslint-enable react-hooks/set-state-in-effect */
      return
    }
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        // Build audience filter as a Postgrest `or(...)` expression. The
        // `push_messages` table isn't in the generated Database types yet —
        // cast through `unknown` so the rest of the file stays strongly typed.
        const audienceFilters = [
          'audience.eq.all',
          // `custom_account_ids` is text[] — `cs` = contains.
          `and(audience.eq.custom,custom_account_ids.cs.{${accountId}})`,
        ]
        if (role === 'member' || role === 'r2' || role === 'r3' || role === 'r4' || role === 'r5') {
          audienceFilters.push('audience.eq.voting')
        }
        if (role === 'r4' || role === 'r5') {
          audienceFilters.push('audience.eq.admins')
        }
        if (role === 'ally') {
          audienceFilters.push('audience.eq.allies')
        }

        const { data, error } = await (supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              not: (col: string, op: string, value: unknown) => {
                eq: (col: string, value: unknown) => {
                  or: (filter: string) => {
                    order: (col: string, opts: { ascending: boolean }) => {
                      limit: (n: number) => Promise<{ data: PushMessageRow[] | null; error: { message: string } | null }>
                    }
                  }
                }
              }
            }
          }
        })
          .from('push_messages')
          .select('id,title,body,emoji,image_url,audience,custom_account_ids,tap_target,tap_url,created_at,sent_at,scheduled_for,cancelled')
          .not('sent_at', 'is', null)
          .eq('cancelled', false)
          .or(audienceFilters.join(','))
          .order('sent_at', { ascending: false })
          .limit(MAX_MESSAGES)

        if (!alive) return
        if (error) {
          // Surface as empty rather than throwing — the bell should never break
          // the header if the table is missing in this environment.
          setMessages([])
        } else {
          setMessages(data ?? [])
        }
      } catch {
        if (alive) setMessages([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [cacheKey, accountId, role])

  const unreadCount = useMemo(() => {
    if (!lastSeenMs) return messages.length
    return messages.filter((m) => {
      const ts = Date.parse(m.sent_at ?? m.created_at)
      return Number.isFinite(ts) && ts > lastSeenMs
    }).length
  }, [messages, lastSeenMs])

  const markAllAsSeen = useCallback(() => {
    const nowIso = new Date().toISOString()
    writeLastSeen(nowIso)
    setLastSeenMs(Date.parse(nowIso))
  }, [])

  return { messages, unreadCount, loading, markAllAsSeen }
}
