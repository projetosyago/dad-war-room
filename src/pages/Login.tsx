import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CaretDown,
  Check,
  CircleNotch,
  DeviceMobile,
  Eye,
  EyeSlash,
  User,
  WarningCircle,
} from '@phosphor-icons/react'
import { EmbersBackground } from '../components/login/EmbersBackground'
import { ForgeTitle } from '../components/login/ForgeTitle'
import { OrnamentStamp } from '../components/login/OrnamentStamp'
import { PwaInstallModal } from '../components/PwaInstallModal'
import { useAuth } from '../hooks/useAuth'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY } from '../i18n'

// Compact flag + native name table — used for the inline dropdown on the
// login page. Mirrors src/components/settings/LanguagePicker so swapping
// from one to the other is consistent.
const LANG_META: Record<string, { native: string; flag: string }> = {
  en: { native: 'English', flag: '🇬🇧' },
  pt: { native: 'Português', flag: '🇧🇷' },
  es: { native: 'Español', flag: '🇪🇸' },
  fr: { native: 'Français', flag: '🇫🇷' },
  de: { native: 'Deutsch', flag: '🇩🇪' },
  ru: { native: 'Русский', flag: '🇷🇺' },
  tr: { native: 'Türkçe', flag: '🇹🇷' },
  ar: { native: 'العربية', flag: '🇸🇦' },
  zh: { native: '中文', flag: '🇨🇳' },
  ko: { native: '한국어', flag: '🇰🇷' },
  ja: { native: '日本語', flag: '🇯🇵' },
}

/**
 * Login — Throne Hall design. Wires up Fase B Supabase auth: username +
 * password → synthetic email mapping handled inside the auth repo. On success,
 * redirects to the `from` route (if redirected from a protected page) or to /.
 *
 * Layout: video (optional) + canvas embers + atmospheric scrim layers under
 * a bare typographic hero (BIGDADDYS forge-reveal + DAD acronym stamp) and
 * an underline-style form. No header/footer/bottom-nav — App.tsx skips them.
 */
export function Login() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const auth = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const pwa = usePwaInstall()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const [installModalOpen, setInstallModalOpen] = useState(false)

  const currentLang = (i18n.language?.slice(0, 2) ?? 'en') as keyof typeof LANG_META
  const currentMeta = LANG_META[currentLang] ?? LANG_META.en

  const redirectTo = location.state?.from ?? '/'

  async function chooseLang(code: string) {
    await i18n.changeLanguage(code)
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code)
    } catch {
      /* private mode etc — ignore */
    }
    setLangOpen(false)
  }

  async function handleInstallClick() {
    const outcome = await pwa.install()
    // 'manual' means the platform has no programmatic prompt (iOS Safari,
    // macOS Safari, Firefox) — show the tutorial modal instead. 'installed',
    // 'dismissed', and 'already' all need no further UI here.
    if (outcome === 'manual') setInstallModalOpen(true)
  }

  // Toggle body class so global mesh-drift backgrounds don't fight our scene.
  useEffect(() => {
    document.body.classList.add('login-active')
    return () => document.body.classList.remove('login-active')
  }, [])

  // If they're already signed in, bounce to the redirect target.
  useEffect(() => {
    if (auth.status === 'signed-in') {
      navigate(redirectTo, { replace: true })
    }
  }, [auth.status, navigate, redirectTo])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (submitting) return
    if (!username.trim() || !password) {
      setError(t('login.errors.required'))
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await auth.signInWithUsername(username, password)
      // useAuth.refresh fires inside signInWithUsername; the redirect effect
      // above will pick up the state change. No explicit navigate needed.
    } catch (err) {
      const message = err instanceof Error ? err.message : t('login.errors.signInFailed')
      // Supabase returns "Invalid login credentials" — keep it friendly.
      const friendly = /invalid login/i.test(message)
        ? t('login.errors.wrongCredentials')
        : message
      setError(friendly)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-root">
      {/* — Background stack — */}
      <div className="login-bg-base" aria-hidden="true" />
      <video
        ref={videoRef}
        className="login-bg-video"
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        onLoadedData={(e) => {
          const v = e.currentTarget
          if (v.videoWidth > 0) v.classList.add('loaded')
        }}
        onError={() => {
          const v = videoRef.current
          if (v) v.style.display = 'none'
        }}
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>
      <EmbersBackground />
      <div className="login-bg-heat" aria-hidden="true" />
      <div className="login-bg-smoke" aria-hidden="true" />
      <div className="login-bg-scrim" aria-hidden="true" />
      <div className="login-bg-vignette" aria-hidden="true" />

      {/* — Top chrome — */}
      <div className="login-top">
        <div className="login-brand">
          <span className="login-brand-dot" aria-hidden="true" />
          <span>
            <span style={{ color: '#ffdb8a' }}>DAD</span>
            <span className="login-brand-sep">·</span>
            {t('login.brandSuffix')}
          </span>
        </div>
        <div className="login-lang-wrap" style={{ position: 'relative' }}>
          <button
            type="button"
            className="login-lang"
            aria-label={t('login.changeLanguage')}
            aria-expanded={langOpen}
            aria-haspopup="listbox"
            onClick={() => setLangOpen((v) => !v)}
          >
            <span className="login-lang-flag" aria-hidden="true">{currentMeta.flag}</span>
            <span>{currentLang.toUpperCase()}</span>
            <CaretDown size={11} weight="regular" />
          </button>
          {langOpen && (
            <>
              {/* Click-away overlay — invisible, covers viewport so any tap
                  outside the menu closes it. Mobile-friendly alternative to
                  document-level mousedown listeners. */}
              <button
                type="button"
                aria-hidden="true"
                onClick={() => setLangOpen(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'transparent',
                  border: 0,
                  zIndex: 40,
                }}
              />
              <ul
                role="listbox"
                aria-label={t('login.changeLanguage')}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  zIndex: 50,
                  minWidth: 200,
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  background: 'rgba(13,15,28,0.96)',
                  backdropFilter: 'blur(18px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(160%)',
                  border: '1px solid rgba(244,207,115,0.32)',
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: '0 14px 36px rgba(0,0,0,0.7)',
                  margin: 0,
                  listStyle: 'none',
                }}
              >
                {SUPPORTED_LANGUAGES.map((code) => {
                  const meta = LANG_META[code]
                  const active = code === currentLang
                  return (
                    <li key={code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => chooseLang(code)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 8,
                          background: active ? 'rgba(244,207,115,0.12)' : 'transparent',
                          border: active
                            ? '1px solid rgba(244,207,115,0.45)'
                            : '1px solid transparent',
                          color: active ? '#ffdb8a' : '#f0e9d6',
                          fontSize: 14,
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background 120ms, border-color 120ms',
                        }}
                      >
                        <span style={{ fontSize: 16, lineHeight: 1 }}>{meta?.flag ?? '🏳️'}</span>
                        <span style={{ flex: 1 }}>{meta?.native ?? code}</span>
                        <span
                          style={{
                            fontSize: 10,
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            color: '#7a7464',
                          }}
                        >
                          {code}
                        </span>
                        {active && <Check size={14} weight="bold" style={{ color: '#ffdb8a' }} />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      </div>

      {/* — Stage — */}
      <main className="login-stage">
        <div className="login-hero">
          <div className="login-eyebrow">{t('login.eyebrow')}</div>
          <ForgeTitle text="BIGDADDYS" />
          <OrnamentStamp />
        </div>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-username">{t('login.fields.username')}</label>
            <div className="login-field-input">
              <input
                id="login-username"
                type="text"
                placeholder={t('login.fields.usernamePlaceholder')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={submitting}
                required
              />
              <span className="login-field-ico" aria-hidden="true">
                <User size={18} weight="duotone" />
              </span>
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password">{t('login.fields.password')}</label>
            <div className="login-field-input">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
              <button
                type="button"
                className="login-field-ico login-field-ico-btn"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? t('login.fields.hidePassword') : t('login.fields.showPassword')}
              >
                {showPassword ? (
                  <EyeSlash size={18} weight="duotone" />
                ) : (
                  <Eye size={18} weight="duotone" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <WarningCircle size={14} weight="duotone" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? (
              <>
                <CircleNotch size={13} weight="bold" className="login-submit-spin" />
                <span>{t('login.submitting')}</span>
              </>
            ) : (
              <>
                <span>{t('login.enter')}</span>
                <ArrowRight size={13} weight="regular" className="login-submit-arrow" />
              </>
            )}
          </button>

          <p className="login-forgot">
            {t('login.forgot.prefix')} <strong>{t('login.forgot.askR4R5')}</strong>
          </p>
        </form>

        <div className="login-bottom">
          {!pwa.installed && (
            <button type="button" className="login-pwa" onClick={handleInstallClick}>
              <DeviceMobile size={14} weight="duotone" />
              <span>
                <strong>{t('login.installPwa')}</strong>
              </span>
            </button>
          )}
          <div className="login-credit">
            {t('login.builtBy')} <span>Salles</span>
          </div>
        </div>
      </main>

      {/* Manual-install tutorial modal — only opened when the browser doesn't
          fire `beforeinstallprompt` (iOS Safari, macOS Safari, Firefox). */}
      <PwaInstallModal
        open={installModalOpen}
        platform={pwa.platform}
        onClose={() => setInstallModalOpen(false)}
      />
    </div>
  )
}
