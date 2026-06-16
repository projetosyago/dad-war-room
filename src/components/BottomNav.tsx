import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  House,
  Sword,
  ChatCircle,
  ShieldStar,
  GearSix,
} from '@phosphor-icons/react'
import { motion } from 'framer-motion'
import { cn } from '../lib/cn'
import { I18nText } from './I18nText'

interface NavItem {
  to: string
  labelKey: string
  icon: typeof House
  end?: boolean
}

// PLANNING.md §1octies-bis — final member nav (5 tabs).
// Members tab REMOVED; moved to /alliance/members subroute.
// Chat is a coming-soon placeholder until Fase Y.
// Labels resolved via t() at render time so they react to locale changes.
const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: House, end: true },
  { to: '/events', labelKey: 'nav.events', icon: Sword },
  { to: '/chat', labelKey: 'nav.chat', icon: ChatCircle },
  { to: '/alliance', labelKey: 'nav.alliance', icon: ShieldStar },
  { to: '/settings', labelKey: 'nav.settings', icon: GearSix },
]

/**
 * Mobile bottom tab bar. Sticky to viewport; safe-area aware for iPhones.
 * Active tab gets a gold glow + halo behind the icon + dot underneath.
 */
export function BottomNav() {
  const { t } = useTranslation()
  return (
    <nav
      className="md:hidden fixed inset-x-0 bottom-0 z-40 pb-safe"
      style={{
        background: 'linear-gradient(180deg, rgba(31,37,66,0.82) 0%, rgba(19,23,42,0.97) 100%)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        borderTop: '1px solid rgba(244, 207, 115, 0.22)',
        boxShadow: '0 -10px 30px -10px rgba(0,0,0,0.6)',
      }}
      aria-label={t('nav.primaryAriaLabel')}
    >
      {/* Top accent line */}
      <span
        aria-hidden
        className="absolute inset-x-8 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(244,207,115,0.55), transparent)',
        }}
      />

      <ul className="grid grid-cols-5 px-1 pt-1.5 relative">
        {NAV.map((item) => (
          <li key={item.to} className="relative">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'group relative flex flex-col items-center justify-center gap-1 px-1 pt-2.5 pb-2 rounded-xl transition-colors',
                  'min-h-[58px] active:scale-[0.96]',
                  isActive ? 'text-gold' : 'text-ink-mute',
                )
              }
              aria-label={t(item.labelKey)}
            >
              {({ isActive }) => (
                <>
                  {/* Gold radial glow behind active icon */}
                  {isActive && (
                    <motion.span
                      layoutId="bottomnav-glow"
                      aria-hidden
                      className="absolute -top-1 h-12 w-12 rounded-full blur-xl"
                      style={{
                        background:
                          'radial-gradient(circle, rgba(244,207,115,0.45), transparent 70%)',
                      }}
                      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
                    />
                  )}
                  <item.icon
                    size={22}
                    weight={isActive ? 'duotone' : 'duotone'}
                    className={cn(
                      'relative transition-transform',
                      isActive
                        ? 'scale-[1.08] text-gold drop-shadow-[0_0_6px_rgba(244,207,115,0.55)]'
                        : 'text-ink-mute group-hover:text-ink-soft',
                    )}
                  />
                  <I18nText
                    k={item.labelKey}
                    maxLines={2}
                    className={cn(
                      'text-[10px] tracking-[0.12em] uppercase leading-tight transition-colors text-center px-0.5',
                      isActive ? 'text-gold-soft font-semibold' : 'text-ink-mute',
                    )}
                  />
                  {isActive && (
                    <motion.span
                      layoutId="bottomnav-dot"
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
    </nav>
  )
}

/** Spacer so page content doesn't sit under the bottom bar. */
export function BottomNavSpacer() {
  return <div aria-hidden className="md:hidden h-[72px] pb-safe" />
}
