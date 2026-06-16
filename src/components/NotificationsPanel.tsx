import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BellRinging } from '@phosphor-icons/react'
import { cn } from '../lib/cn'
import { useMyNotifications, type PushMessageRow, type PushTapTarget } from '../hooks/useMyNotifications'

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
}

const TAP_ROUTE: Record<Exclude<PushTapTarget, 'url'>, string> = {
  hub: '/',
  events: '/events',
  polls: '/alliance/polls',
  alliance: '/alliance',
}

function resolveTarget(msg: PushMessageRow): string {
  if (msg.tap_target === 'url') return msg.tap_url ?? '/'
  return TAP_ROUTE[msg.tap_target] ?? '/'
}

/** Short "3min" / "2h" / "4d" stamp. Anything older falls back to a date.
 * Accepts a translator so the "agora" (just now) label can be localized.
 */
function timeAgo(iso: string | null, tNow: string): string {
  if (!iso) return ''
  const then = Date.parse(iso)
  if (!Number.isFinite(then)) return ''
  const diffMs = Date.now() - then
  if (diffMs < 0) return tNow
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return `${sec}s`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}min`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(then).toLocaleDateString()
}

export function NotificationsPanel({ open, onClose }: NotificationsPanelProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { messages, loading } = useMyNotifications()
  const panelRef = useRef<HTMLDivElement | null>(null)

  // Close on outside click + Escape — the bell button toggles `open`, so we
  // don't need to handle clicks on the trigger itself; ignoring any element
  // that lives inside this panel keeps internal clicks from bubbling-shut it.
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      const node = panelRef.current
      if (!node) return
      if (node.contains(e.target as Node)) return
      // The trigger button has aria-label="Notifications" — let it toggle on
      // its own without us racing it shut.
      const target = e.target as HTMLElement | null
      if (target?.closest('[aria-label="Notifications"]')) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const handlePick = (msg: PushMessageRow) => {
    onClose()
    const dest = resolveTarget(msg)
    // External URL → real navigation; internal route → react-router.
    if (/^https?:\/\//i.test(dest)) {
      window.location.href = dest
    } else {
      navigate(dest)
    }
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('notifications.panelAriaLabel')}
      className={cn(
        'absolute right-0 top-full mt-2 w-[20rem] sm:w-[22rem] z-[60]',
        'card-hero p-0 overflow-hidden',
      )}
    >
      {/* Header strip — mirrors card-hero anatomy (gold hairline ::before lives on the wrapper) */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-gold/15">
        <div className="flex items-center gap-2">
          <BellRinging size={14} weight="duotone" className="text-gold-soft" />
          <span className="font-display text-[11px] tracking-[0.22em] uppercase text-ink-cream">
            {t('notifications.title')}
          </span>
        </div>
        <span className="text-[10px] text-ink-mute">{messages.length}</span>
      </div>

      <div className="max-h-[60vh] overflow-y-auto">
        {loading && messages.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-ink-mute">{t('common.loading')}</div>
        ) : messages.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-ink-mute">
            {t('notifications.empty')}
          </div>
        ) : (
          <ul className="divide-y divide-gold/10">
            {messages.map((msg) => {
              const when = timeAgo(msg.sent_at ?? msg.created_at, t('notifications.timeNow'))
              return (
                <li key={msg.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(msg)}
                    className={cn(
                      'w-full text-left px-4 py-3 flex items-start gap-3',
                      'hover:bg-white/[0.04] transition-colors',
                    )}
                  >
                    <span
                      aria-hidden
                      className="text-base leading-none mt-0.5 select-none"
                    >
                      {msg.emoji ?? '🔔'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[12px] text-ink-cream truncate">
                          {msg.title}
                        </span>
                        <span className="text-[10px] text-ink-mute shrink-0">{when}</span>
                      </span>
                      <span className="block text-[11px] text-ink-soft truncate mt-0.5">
                        {msg.body}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-gold/15 px-4 py-2 text-right">
        <button
          type="button"
          onClick={() => {
            onClose()
            navigate('/settings')
          }}
          className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-soft hover:text-gold"
        >
          {t('notifications.viewAll')}
        </button>
      </div>
    </div>
  )
}
