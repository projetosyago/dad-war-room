import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DeviceMobile, CheckCircle, Download } from '@phosphor-icons/react'
import { useAuth } from '../../hooks/useAuth'
import { markPwaInstalled } from '../../repositories/accounts'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  // iOS Safari
  return (window.navigator as unknown as { standalone?: boolean }).standalone === true
}

/**
 * PWA install entry point — captures the browser's `beforeinstallprompt`
 * event and exposes a button. Once installed, stamps `pwa_installed_at` on
 * the signed-in account so admins can track install rates (Analytics page).
 */
export function PwaInstallButton() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isStandalone())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    function onInstalled() {
      setInstalled(true)
      setDeferred(null)
      if (auth.account?.id) {
        markPwaInstalled(auth.account.id).catch(() => {/* non-fatal */})
      }
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [auth.account?.id])

  async function install() {
    if (!deferred) return
    setBusy(true)
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
        setDeferred(null)
        if (auth.account?.id) {
          markPwaInstalled(auth.account.id).catch(() => {/* non-fatal */})
        }
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-hero">
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <DeviceMobile size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('settings.pwa.eyebrow')}</div>
          <h3 className="hero-title text-base sm:text-lg mt-0.5">{t('settings.pwa.title')}</h3>
          <p className="text-[11px] text-ink-mute mt-1 leading-snug">
            {installed
              ? t('settings.pwa.alreadyInstalled')
              : deferred
                ? t('settings.pwa.addToHomescreen')
                : t('settings.pwa.openInBrowser')}
          </p>
        </div>
      </div>
      <div className="card-foot">
        <span className="text-[11px] text-ink-mute">
          {installed ? t('settings.pwa.standaloneMode') : t('settings.pwa.browserMode')}
        </span>
        {installed ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft">
            <CheckCircle size={13} weight="duotone" /> {t('settings.pwa.installed')}
          </span>
        ) : (
          <button
            type="button"
            onClick={install}
            disabled={!deferred || busy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-gold hover:text-gold-shimmer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} weight="duotone" />
            {t('settings.pwa.install')}
          </button>
        )}
      </div>
    </div>
  )
}
