import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ADMIN_TOP_NAV } from './AdminBottomNav'
import {
  ArrowLeft,
  House,
  Sword,
  ChatCircle,
  ShieldStar,
  GearSix,
  BellRinging,
  Crown,
  SignOut,
} from '@phosphor-icons/react'
import { useAdminMode } from '../contexts/AdminModeContext'
import { cn } from '../lib/cn'
import { NotificationsPanel } from './NotificationsPanel'
import { useMyNotifications } from '../hooks/useMyNotifications'

// Member top nav (md+) — matches the bottom nav (Members → Chat tab swap).
// Labels resolved via t() inside HeaderInner so they react to locale changes.
const TOP_NAV = [
  { to: '/', labelKey: 'nav.home', icon: House, exact: true },
  { to: '/events', labelKey: 'nav.events', icon: Sword },
  { to: '/chat', labelKey: 'nav.chat', icon: ChatCircle },
  { to: '/alliance', labelKey: 'nav.alliance', icon: ShieldStar },
  { to: '/settings', labelKey: 'nav.settings', icon: GearSix },
]

export function Header() {
  const { adminMode, exit } = useAdminMode()
  const navigate = useNavigate()
  // Navigate FIRST, then exit admin mode. If we flip the order, the auto-enter
  // effect in App.tsx (gated on pathname.startsWith('/admin/') && !adminMode)
  // fires during the same render with the new adminMode=false but the still-stale
  // /admin/* pathname, re-entering admin mode and forcing the user to click Sair
  // twice. Navigating first guarantees pathname is /settings by the time exit() lands.
  const onExit = () => { navigate('/settings'); exit() }
  return <HeaderInner adminMode={adminMode} onExitAdmin={onExit} />
}

function HeaderInner({ adminMode, onExitAdmin }: { adminMode: boolean; onExitAdmin: () => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const { unreadCount, markAllAsSeen } = useMyNotifications()
  const hasUnreadNotifications = unreadCount > 0
  // Show a generic browser-back affordance on every internal page. Hub (/) keeps
  // its branded layout, and /login renders bare (Header isn't mounted there) but
  // we guard it anyway in case the bare-route list ever changes.
  const showBack = pathname !== '/' && pathname !== '/login'

  const handleBellClick = () => {
    setBellOpen((prev) => {
      const next = !prev
      // Stamp last-seen when we open (not when we close) so the red dot only
      // clears once the user has actually had the chance to read the list.
      if (next) markAllAsSeen()
      return next
    })
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="sticky top-0 z-50 pt-safe">
      <div
        className={cn(
          'glass-strong transition-all duration-300',
          scrolled ? 'border-b border-gold/30' : 'border-b border-gold/20',
        )}
        style={{
          // Stronger floor color so the bar stays readable against any page
          // background. The previous .62 alpha let the dark page bleed through
          // and made the title look like it had disappeared.
          backgroundColor: scrolled ? 'rgba(19,23,42,0.95)' : 'rgba(19,23,42,0.88)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        }}
      >
        <div
          className={cn(
            'container-wide flex items-center gap-3 transition-all duration-300',
            // Hub keeps justify-between (brand left, actions right). Internal
            // pages use a 3-slot layout (back · centered title · actions) which
            // needs the leading and trailing slots to claim equal width via
            // flex-1 — we do that on the slots themselves below.
            showBack ? '' : 'justify-between',
            scrolled ? 'h-14' : 'h-16',
          )}
        >
          {showBack ? (
            // Internal pages: [back icon] [centered title] [bell]. Wrapping
            // the icon button in a flex-1 box lets the title sit truly
            // centered between the leading and trailing slots.
            <div className="flex-1 flex justify-start">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-icon"
                aria-label={t('nav.back')}
                title={t('nav.back')}
              >
                <ArrowLeft size={18} weight="bold" />
              </button>
            </div>
          ) : null}

          <Link
            to="/"
            className={cn(
              'group leading-none min-w-0',
              // On Hub: brand sits at the start, kingdom chip stacks beneath on mobile.
              // On internal pages: brand becomes a centered title (no chip, no stack).
              showBack
                ? 'flex items-center justify-center text-center'
                : 'flex flex-col',
            )}
            aria-label={t('brand.name')}
          >
            <span
              className="font-display text-base sm:text-[17px] tracking-[0.18em] uppercase truncate text-gold-shimmer notranslate"
              translate="no"
            >
              DAD BIGDADDYS
            </span>
            {/* Kingdom tag only on mobile, and only on Hub — internal pages get a
                cleaner centered title with no secondary chip. */}
            {!showBack && (
              <span className="md:hidden flex items-center gap-1 text-[10px] text-ink-mute tracking-[0.28em] uppercase mt-0.5">
                <Crown size={11} weight="duotone" className="text-gold-soft" />
                {t('header.kingdomTag')}
              </span>
            )}
          </Link>

          {/* Desktop nav — member (5 tabs) OR admin (Sair + 7 tabs), swapped by
              adminMode. Suppressed on internal pages so the back-title-bell
              triptych stays clean; users still have the bottom nav + admin top
              nav remains reachable via /admin/* breadcrumbs. */}
          {showBack ? null : adminMode ? (
            <nav className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={onExitAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] border border-crimson/40 bg-crimson/10 text-crimson-glow hover:bg-crimson/20 transition-colors mr-1"
                title={t('nav.exitAdmin')}
                aria-label={t('nav.exitAdmin')}
              >
                <SignOut size={14} weight="duotone" />
                {t('nav.exitAdminShort')}
              </button>
              {ADMIN_TOP_NAV.map(({ to, labelKey, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] transition-colors',
                      isActive
                        ? 'bg-gold/12 text-gold-soft border border-gold/35'
                        : 'text-ink-soft hover:text-ink-cream hover:bg-white/5 border border-transparent',
                    )
                  }
                >
                  <Icon size={14} weight="duotone" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-1">
              {TOP_NAV.map(({ to, labelKey, icon: Icon, exact }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] transition-colors',
                      isActive
                        ? 'bg-gold/12 text-gold-soft border border-gold/35'
                        : 'text-ink-soft hover:text-ink-cream hover:bg-white/5 border border-transparent',
                    )
                  }
                >
                  <Icon size={14} weight="duotone" />
                  {t(labelKey)}
                </NavLink>
              ))}
            </nav>
          )}

          {/* Right side actions */}
          {/* Global search (Cmd-K) intentionally deferred — revisit once the
              dataset (members + events + milestones + polls) is large enough
              to need it. Until then, fewer chrome icons = cleaner header. */}
          {/* On internal pages we take flex-1 + justify-end so the centered
              title (also flex-1) lands in the optical middle of the bar. */}
          <div
            className={cn(
              'flex items-center gap-2',
              showBack ? 'flex-1 justify-end' : 'shrink-0',
            )}
          >
            {/* In admin mode on internal pages, keep the Exit affordance reachable
                — the full admin top nav is suppressed (spec calls for a clean
                back · title · bell triptych), but losing the only way out of
                admin mode would strand the user. */}
            {showBack && adminMode && (
              <button
                type="button"
                onClick={onExitAdmin}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-[0.18em] border border-crimson/40 bg-crimson/10 text-crimson-glow hover:bg-crimson/20 transition-colors"
                title={t('nav.exitAdmin')}
                aria-label={t('nav.exitAdmin')}
              >
                <SignOut size={14} weight="duotone" />
                {t('nav.exitAdminShort')}
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={handleBellClick}
                className="btn-icon relative"
                aria-label={
                  hasUnreadNotifications
                    ? t('notifications.bellAriaLabelUnread', { count: unreadCount })
                    : t('notifications.bellAriaLabel')
                }
                aria-haspopup="dialog"
                aria-expanded={bellOpen}
              >
                <BellRinging size={18} weight="duotone" />
                {hasUnreadNotifications && (
                  <span
                    aria-hidden
                    className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-crimson-glow shadow-[0_0_6px_rgba(226,86,86,0.6)]"
                  />
                )}
              </button>
              <NotificationsPanel open={bellOpen} onClose={() => setBellOpen(false)} />
            </div>
          </div>
        </div>
      </div>
      {/* Hairline under header — gold in member mode, crimson in admin mode (signals context) */}
      <div
        className={cn(
          'h-px w-full transition-colors duration-300',
          adminMode
            ? 'bg-gradient-to-r from-transparent via-crimson-glow/60 to-transparent'
            : 'bg-gradient-to-r from-transparent via-gold/40 to-transparent',
        )}
      />
      {adminMode && (
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-crimson/20 to-transparent" />
      )}
    </header>
  )
}
