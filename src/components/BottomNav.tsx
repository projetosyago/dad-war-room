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
      className="md:hidden fixed inset-x-0 bottom-0 z-40"
      style={{
        // Solid color (slightly darker than --ink-void body bg) so the nav
        // reads as a discrete UI surface, not a translucent overlay. Gradient
        // ends at the body color so the iOS home-indicator safe-area zone
        // (rendered as paddingBottom below) visually merges with the page
        // background instead of looking like a "wasted" dark band.
        background:
          'linear-gradient(180deg, rgb(11,13,25) 0%, rgb(19,23,42) 100%)',
        borderTop: '1px solid rgba(244, 207, 115, 0.32)',
        boxShadow: '0 -2px 14px rgba(0,0,0,0.7)',
        // pb-safe via inline style so the env() doesn't get min()-clamped to
        // 0.5rem — on devices WITHOUT a home indicator we want 0 padding so
        // the icons sit flush against the bottom.
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label={t('nav.primaryAriaLabel')}
    >
      {/* Top accent line — full width edge-to-edge so the nav reads as a
          continuous bar instead of "floating" inset. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(244,207,115,0.55) 20%, rgba(244,207,115,0.55) 80%, transparent)',
        }}
      />

      <ul className="grid grid-cols-5 px-1 pt-1 pb-1 relative">
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

/** Spacer so page content doesn't sit under the bottom bar.
 *
 * Sizing logic — the fixed BottomNav above measures:
 *   pt-1.5 (6px) + min-h-[58px] icon row + pb-safe (max(0.5rem, env(safe-area-inset-bottom)))
 * On an iPhone Pro that's ~98px (6 + 58 + 34). The previous `h-[72px] pb-safe`
 * relied on padding inside a 72px box, which under border-box meant the safe-area
 * padding ATE INTO the spacer instead of extending it — so the last ~20-26px of
 * page content rendered behind the nav on notched iPhones. Fix: use min-height
 * (so the box can grow) and an additive calc that mirrors the nav exactly.
 */
export function BottomNavSpacer() {
  return (
    <div
      aria-hidden
      className="md:hidden"
      style={{
        minHeight: 'calc(64px + max(0.5rem, env(safe-area-inset-bottom)))',
      }}
    />
  )
}
