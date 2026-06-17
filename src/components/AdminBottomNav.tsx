import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BellRinging,
  CalendarPlus,
  CaretLeft,
  CaretRight,
  ChartBar,
  ChatCircle,
  ListChecks,
  ShieldStar,
  SignOut,
  UsersThree,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { useAdminMode } from '../contexts/AdminModeContext'
import { cn } from '../lib/cn'

interface AdminNavItem {
  to: string
  labelKey: string
  icon: typeof CalendarPlus
}

// PLANNING.md §1octies-bis · admin nav (7 tabs in the scrollable strip).
// "Sair" is rendered OUTSIDE the scroll container so it never collides
// with the scrolling tabs — the previous sticky+gradient approach allowed
// the scrolled tabs to slide UNDER Sair, swallowing its hitbox.
// Labels resolved via t() at render time so they react to locale changes.
const ADMIN_NAV: AdminNavItem[] = [
  { to: '/admin/events',        labelKey: 'nav.adminEvents',        icon: CalendarPlus },
  { to: '/admin/polls',         labelKey: 'nav.adminPolls',         icon: ListChecks },
  { to: '/admin/members',       labelKey: 'nav.adminMembers',       icon: UsersThree },
  { to: '/admin/chat',          labelKey: 'nav.adminChat',          icon: ChatCircle },
  { to: '/admin/alliance',      labelKey: 'nav.adminAlliance',      icon: ShieldStar },
  { to: '/admin/notifications', labelKey: 'nav.adminNotifications', icon: BellRinging },
  { to: '/admin/analytics',     labelKey: 'nav.adminAnalytics',     icon: ChartBar },
]

export function AdminBottomNav() {
  const navigate = useNavigate()
  const { exit } = useAdminMode()
  const { t } = useTranslation()

  // Scroll-overflow affordance: the 7-tab strip rarely fits on phones, so we
  // surface chevron buttons whenever there's content hidden off-screen on
  // either side. The previous nav silently cut tabs off — users didn't realise
  // they could scroll horizontally to reach them.
  const scrollRef = useRef<HTMLUListElement>(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const updateChevrons = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    // 4px tolerance so sub-pixel rounding doesn't keep the chevron lit at edges.
    setShowLeft(scrollLeft > 4)
    setShowRight(scrollWidth - clientWidth - scrollLeft > 4)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateChevrons()
    el.addEventListener('scroll', updateChevrons, { passive: true })
    const ro = new ResizeObserver(updateChevrons)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', updateChevrons)
      ro.disconnect()
    }
  }, [updateChevrons])

  function scrollBy(direction: 'left' | 'right') {
    const el = scrollRef.current
    if (!el) return
    const delta = Math.max(120, Math.round(el.clientWidth * 0.6))
    el.scrollBy({ left: direction === 'left' ? -delta : delta, behavior: 'smooth' })
  }

  function handleExit() {
    // Navigate FIRST, then exit admin mode. The auto-enter effect in App.tsx
    // (gated on pathname.startsWith('/admin/') && !adminMode) would otherwise
    // re-flip adminMode back to true during the same render — because adminMode
    // becomes false before pathname leaves /admin/* — forcing the user to click
    // Sair twice. Navigating first lands pathname on /settings before exit() runs.
    navigate('/settings')
    exit()
  }

  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 pb-safe"
      style={{
        background: 'linear-gradient(180deg, rgba(46, 22, 22, 0.82) 0%, rgba(19,23,42,0.97) 100%)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: '1px solid rgba(177, 56, 56, 0.32)',
        boxShadow: '0 -10px 30px -10px rgba(0,0,0,0.6)',
      }}
      aria-label={t('nav.adminAriaLabel')}
    >
      {/* Crimson hairline */}
      <span
        aria-hidden
        className="absolute inset-x-8 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(226, 86, 86, 0.65), transparent)' }}
      />

      <div className="flex items-stretch pt-1.5 px-1">
        {/* SAIR — outside the scroll, can't be overlapped */}
        <div className="shrink-0 pr-1 mr-1 border-r border-crimson/25">
          <button
            type="button"
            onClick={handleExit}
            className="group relative flex flex-col items-center justify-center gap-1 px-3 pt-2.5 pb-2 rounded-xl transition-colors min-h-[58px] min-w-[66px] active:scale-[0.96] text-crimson-glow"
            aria-label={t('nav.exitAdmin')}
          >
            <SignOut
              size={22}
              weight="duotone"
              className="text-crimson-glow drop-shadow-[0_0_6px_rgba(226,86,86,0.55)]"
            />
            <span className="text-[10px] tracking-[0.16em] uppercase leading-none text-crimson-glow font-semibold">
              {t('nav.exitAdminShort')}
            </span>
          </button>
        </div>

        {/* Scrollable 7-tab strip with edge chevron affordances */}
        <div className="relative flex-1 min-w-0">
          {/* Left fade + chevron — only visible when scrolled in from the left */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 left-0 w-10 z-10 transition-opacity duration-200',
              showLeft ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              background:
                'linear-gradient(90deg, rgba(19,23,42,0.92) 0%, rgba(19,23,42,0.65) 55%, rgba(19,23,42,0) 100%)',
            }}
          />
          <button
            type="button"
            onClick={() => scrollBy('left')}
            tabIndex={showLeft ? 0 : -1}
            aria-label={t('nav.scrollLeft')}
            aria-hidden={!showLeft}
            className={cn(
              'absolute left-0.5 top-1/2 -translate-y-1/2 z-20 flex h-8 w-7 items-center justify-center rounded-full transition-opacity duration-200 active:scale-90',
              'bg-crimson/15 text-crimson-glow shadow-[0_0_10px_-2px_rgba(226,86,86,0.45)] backdrop-blur-sm',
              showLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
            )}
          >
            <CaretLeft size={16} weight="bold" />
          </button>

          {/* Right fade + chevron — only visible when there's more strip off-screen to the right */}
          <div
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-y-0 right-0 w-10 z-10 transition-opacity duration-200',
              showRight ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              background:
                'linear-gradient(270deg, rgba(19,23,42,0.92) 0%, rgba(19,23,42,0.65) 55%, rgba(19,23,42,0) 100%)',
            }}
          />
          <button
            type="button"
            onClick={() => scrollBy('right')}
            tabIndex={showRight ? 0 : -1}
            aria-label={t('nav.scrollRight')}
            aria-hidden={!showRight}
            className={cn(
              'absolute right-0.5 top-1/2 -translate-y-1/2 z-20 flex h-8 w-7 items-center justify-center rounded-full transition-opacity duration-200 active:scale-90',
              'bg-crimson/15 text-crimson-glow shadow-[0_0_10px_-2px_rgba(226,86,86,0.45)] backdrop-blur-sm',
              showRight ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
            )}
          >
            <CaretRight size={16} weight="bold" />
          </button>

          <ul
            ref={scrollRef}
            className="flex items-stretch gap-0.5 overflow-x-auto no-scrollbar snap-x"
          >
            {ADMIN_NAV.map((item) => (
            <li key={item.to} className="shrink-0 snap-start">
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex flex-col items-center justify-center gap-1 px-3 pt-2.5 pb-2 rounded-xl transition-colors min-h-[58px] min-w-[68px] active:scale-[0.96]',
                    isActive ? 'text-gold' : 'text-ink-mute',
                  )
                }
                aria-label={t(item.labelKey)}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.span
                        layoutId="adminnav-glow"
                        aria-hidden
                        className="absolute -top-1 h-12 w-12 rounded-full blur-xl"
                        style={{ background: 'radial-gradient(circle, rgba(244,207,115,0.45), transparent 70%)' }}
                        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                      />
                    )}
                    <item.icon
                      size={22}
                      weight="duotone"
                      className={cn(
                        'relative transition-transform',
                        isActive
                          ? 'scale-[1.08] text-gold drop-shadow-[0_0_6px_rgba(244,207,115,0.55)]'
                          : 'text-ink-mute group-hover:text-ink-soft',
                      )}
                    />
                    <span
                      className={cn(
                        'text-[10px] tracking-[0.16em] uppercase leading-none transition-colors whitespace-nowrap',
                        isActive ? 'text-gold-soft font-semibold' : 'text-ink-mute',
                      )}
                    >
                      {t(item.labelKey)}
                    </span>
                    {isActive && (
                      <motion.span
                        layoutId="adminnav-dot"
                        aria-hidden
                        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-gold-gradient shadow-[0_0_8px_rgba(244,207,115,0.6)]"
                        transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
          </ul>
        </div>
      </div>
    </nav>
  )
}

/** Same 7 admin tabs as the bottom nav, also exported so Header.tsx can render the desktop variant. */
export const ADMIN_TOP_NAV = ADMIN_NAV
