import { useTranslation } from 'react-i18next'
import { BellRinging, CheckCircle, Warning, Info } from '@phosphor-icons/react'
import { usePushSubscription } from '../../hooks/usePushSubscription'

/**
 * Settings card-hero entry for opting in to web push notifications.
 *
 * Delegates all browser / subscription state to {@link usePushSubscription}:
 *   - `loading` — initial permission + endpoint probe is in flight
 *   - `permission` — current `Notification.permission` (default | granted | denied)
 *   - `subscribed` — there is an active row in `push_subscriptions` for this device
 *   - `subscribe()` / `unsubscribe()` — wire up / tear down
 *   - `busy` — a subscribe/unsubscribe call is in flight (debounce double clicks)
 *
 * If `VITE_VAPID_PUBLIC_KEY` is missing from the build environment the toggle
 * shows a passive info row instead of an "Ativar" button — push isn't wired
 * for this deployment so there's no key to negotiate the subscription with.
 */
export function PushNotificationsToggle() {
  const { t } = useTranslation()
  const vapidConfigured = Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)
  const { loading, permission, subscribed, subscribe, unsubscribe } =
    usePushSubscription()

  return (
    <div className="card-hero">
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <BellRinging size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('settings.push.eyebrow')}</div>
          <h3 className="hero-title text-base sm:text-lg mt-0.5">{t('settings.push.title')}</h3>
          <p className="text-[11px] text-ink-mute mt-1 leading-snug">
            {t('settings.push.description')}
          </p>
        </div>
      </div>

      {!vapidConfigured ? (
        <div className="card-foot">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-mute">
            <Info size={13} weight="duotone" className="text-gold-soft" />
            {t('settings.push.notConfigured')}
          </span>
        </div>
      ) : loading ? (
        <div className="px-5 sm:px-6 pb-4">
          <div className="h-3 w-32 rounded bg-gold/10 animate-pulse" />
          <div className="mt-2 h-3 w-48 rounded bg-gold/8 animate-pulse" />
        </div>
      ) : permission === 'denied' ? (
        <div className="card-foot">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-crimson-glow">
            <Warning size={13} weight="duotone" />
            {t('settings.push.blocked')}
          </span>
        </div>
      ) : subscribed ? (
        <div className="card-foot">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft">
            <CheckCircle size={13} weight="duotone" /> {t('settings.push.active')}
          </span>
          <button
            type="button"
            onClick={() => {
              void unsubscribe()
            }}
            disabled={loading}
            className="text-xs font-semibold uppercase tracking-[0.22em] text-ink-mute hover:text-crimson-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('settings.push.deactivate')}
          </button>
        </div>
      ) : (
        <div className="card-foot">
          <span className="text-[11px] text-ink-mute">
            {permission === 'granted' ? t('settings.push.permissionGranted') : t('settings.push.notSubscribed')}
          </span>
          <button
            type="button"
            onClick={() => {
              void subscribe()
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-gold hover:text-gold-shimmer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <BellRinging size={13} weight="duotone" />
            {t('settings.push.activate')}
          </button>
        </div>
      )}
    </div>
  )
}
