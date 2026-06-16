import { NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  BellRinging,
  CalendarPlus,
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

  function handleExit() {
    exit()
    navigate('/settings')
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

        {/* Scrollable 7-tab strip */}
        <ul className="flex flex-1 items-stretch gap-0.5 overflow-x-auto no-scrollbar snap-x">
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
    </nav>
  )
}

/** Same 7 admin tabs as the bottom nav, also exported so Header.tsx can render the desktop variant. */
export const ADMIN_TOP_NAV = ADMIN_NAV
