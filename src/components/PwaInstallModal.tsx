import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Export, House, Plus, X } from '@phosphor-icons/react'
import type { InstallPlatform } from '../hooks/usePwaInstall'

interface Props {
  open: boolean
  platform: InstallPlatform
  onClose: () => void
}

/**
 * Tutorial modal shown when the browser doesn't expose a programmatic install
 * API. Steps are platform-specific (iOS Share → Add to Home Screen, macOS
 * Safari File → Add to Dock, Firefox bookmark, etc). i18n keys live under
 * `pwa.install.*` so every locale gets native instructions.
 */
export function PwaInstallModal({ open, platform, onClose }: Props) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const steps = stepsFor(platform, t)
  const title = t(`pwa.install.${platform}.title`, { defaultValue: t('pwa.install.fallback.title') })
  const subtitle = t(`pwa.install.${platform}.subtitle`, { defaultValue: t('pwa.install.fallback.subtitle') })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="card-hero w-full max-w-md mx-3 mb-3 sm:mb-0 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
          <span className="icon-frame icon-frame--sm text-gold-soft">
            <House size={18} weight="duotone" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="eyebrow">{t('pwa.install.eyebrow')}</div>
            <h2 id="pwa-install-title" className="hero-title text-lg sm:text-xl mt-0.5">
              {title}
            </h2>
            <p className="text-[12px] sm:text-xs text-ink-mute mt-1.5 leading-snug">
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon shrink-0"
            aria-label={t('common.close')}
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        <ol className="px-5 sm:px-6 pb-5 space-y-3">
          {steps.map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border border-gold/15 bg-bg-card/40"
            >
              <span className="shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-gold-soft border border-gold/35 bg-gold/10">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 text-sm leading-relaxed text-ink-cream">
                {step.icon && (
                  <span className="inline-flex items-center justify-center w-6 h-6 mr-1.5 align-middle text-gold-soft">
                    {step.icon}
                  </span>
                )}
                <span>{step.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

function stepsFor(
  platform: InstallPlatform,
  t: ReturnType<typeof useTranslation>['t'],
): Array<{ text: string; icon?: React.ReactNode }> {
  switch (platform) {
    case 'ios-safari':
      return [
        {
          text: t('pwa.install.ios-safari.step1'),
          icon: <Export size={16} weight="duotone" />,
        },
        {
          text: t('pwa.install.ios-safari.step2'),
          icon: <Plus size={16} weight="bold" />,
        },
        { text: t('pwa.install.ios-safari.step3') },
      ]
    case 'mac-safari':
      return [
        {
          text: t('pwa.install.mac-safari.step1'),
          icon: <Export size={16} weight="duotone" />,
        },
        { text: t('pwa.install.mac-safari.step2') },
        { text: t('pwa.install.mac-safari.step3') },
      ]
    case 'firefox':
      return [
        { text: t('pwa.install.firefox.step1') },
        { text: t('pwa.install.firefox.step2') },
      ]
    default:
      return [
        { text: t('pwa.install.fallback.step1') },
        { text: t('pwa.install.fallback.step2') },
      ]
  }
}
