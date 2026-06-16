import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CaretDown,
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
import { useAuth } from '../hooks/useAuth'

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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const auth = useAuth()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const redirectTo = location.state?.from ?? '/'

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
        <button type="button" className="login-lang" aria-label={t('login.changeLanguage')}>
          <span className="login-lang-flag" aria-hidden="true">🇬🇧</span>
          <span>EN</span>
          <CaretDown size={11} weight="regular" />
        </button>
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
          <button type="button" className="login-pwa">
            <DeviceMobile size={14} weight="duotone" />
            <span>
              <strong>{t('login.installPwa')}</strong>
            </span>
          </button>
          <div className="login-credit">
            {t('login.builtBy')} <span>Salles</span>
          </div>
        </div>
      </main>
    </div>
  )
}
