import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Translate } from '@phosphor-icons/react'
import { SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY } from '../../i18n'
import { useAuth } from '../../hooks/useAuth'
import { updateMyProfile } from '../../repositories/accounts'

const LANG_META: Record<string, { label: string; native: string; flag: string }> = {
  en: { label: 'English', native: 'English', flag: '🇬🇧' },
  pt: { label: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  es: { label: 'Spanish', native: 'Español', flag: '🇪🇸' },
  fr: { label: 'French', native: 'Français', flag: '🇫🇷' },
  de: { label: 'German', native: 'Deutsch', flag: '🇩🇪' },
  ru: { label: 'Russian', native: 'Русский', flag: '🇷🇺' },
  tr: { label: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  ar: { label: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  zh: { label: 'Chinese', native: '中文', flag: '🇨🇳' },
  ko: { label: 'Korean', native: '한국어', flag: '🇰🇷' },
  ja: { label: 'Japanese', native: '日本語', flag: '🇯🇵' },
}

export function LanguagePicker() {
  const { i18n, t } = useTranslation()
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const current = i18n.language?.slice(0, 2) ?? 'en'
  const currentMeta = LANG_META[current] ?? LANG_META.en

  async function choose(code: string) {
    await i18n.changeLanguage(code)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
    } catch {
      /* private mode etc — ignore */
    }
    if (auth.account?.id) {
      try {
        await updateMyProfile(auth.account.id, { languageCode: code })
      } catch {
        /* non-fatal: localStorage already persisted */
      }
    }
    setOpen(false)
  }

  return (
    <div className="card-hero">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 text-left p-5 sm:p-6 pb-3"
      >
        <span className="icon-frame icon-frame--sm text-gold-soft">
          <Translate size={18} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('settings.language.eyebrow')}</div>
          <h3 className="hero-title text-base sm:text-lg mt-0.5 truncate">
            {currentMeta.flag} {currentMeta.native}
          </h3>
          <div className="text-[11px] text-ink-mute mt-1">
            {t('settings.language.available', { count: SUPPORTED_LANGUAGES.length })}
          </div>
        </div>
        <span className="text-[10px] tracking-[0.28em] uppercase text-gold-soft shrink-0">
          {open ? t('settings.language.close') : t('settings.language.change')}
        </span>
      </button>

      {open && (
        <ul className="px-5 sm:px-6 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {SUPPORTED_LANGUAGES.map((code) => {
            const meta = LANG_META[code]
            const active = code === current
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => choose(code)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    active
                      ? 'border-gold/45 bg-gold/12 text-gold-soft'
                      : 'border-gold/10 bg-bg-card/40 hover:border-gold/30 text-ink-cream'
                  }`}
                >
                  <span className="text-base leading-none">{meta?.flag ?? '🏳️'}</span>
                  <span className="flex-1 text-left truncate">{meta?.native ?? code}</span>
                  <span className="text-[10px] text-ink-mute uppercase tracking-widest">{code}</span>
                  {active && <Check size={14} weight="bold" className="text-gold-soft" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
