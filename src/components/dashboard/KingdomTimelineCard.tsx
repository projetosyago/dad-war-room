import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Shield,
  Sword,
  Crown,
  Sparkle,
  PawPrint,
  Mountains,
  CastleTurret,
  CaretRight,
  WarningCircle,
} from '@phosphor-icons/react'
import { differenceInCalendarDays, format } from 'date-fns'
import { useUpcomingMilestones } from '../../hooks/useMilestones'
import type { MilestoneCategory } from '../../types/domain'
import { ImageWithFallback } from '../ui/ImageWithFallback'
import { resolveMilestoneIcon, type HeroPortrait } from '../../lib/milestoneIcon'
import { cn } from '../../lib/cn'

/**
 * Stack of 3-4 hero portraits, rendered overlapped for compactness — used
 * when a milestone refers to a hero generation (e.g. "Generation 4 Heroes").
 * Width grows with portrait count but stays bounded so the row layout doesn't
 * jump. Each circle uses the same crimson ring that brands Mythic heroes
 * across the rest of the app.
 */
function HeroStack({
  portraits,
  altLabel,
  tint,
}: {
  portraits: HeroPortrait[]
  altLabel: string
  tint: string
}) {
  // Cap at 4 — beyond that the stack gets noisy. The full list shows up on
  // the detail page anyway.
  const shown = portraits.slice(0, 4)
  return (
    <div
      className="relative shrink-0 flex items-center"
      style={{ width: `${28 + (shown.length - 1) * 16}px`, height: 40 }}
      aria-label={altLabel}
    >
      {shown.map((p, i) => (
        <span
          key={p.slug}
          className="absolute inline-flex h-10 w-10 sm:h-11 sm:w-11 rounded-full border overflow-hidden bg-bg-deep"
          style={{
            left: `${i * 16}px`,
            zIndex: shown.length - i,
            borderColor: `${tint}88`,
            boxShadow: `0 0 8px -2px ${tint}66`,
          }}
        >
          <ImageWithFallback
            src={p.src}
            alt={p.slug}
            className="h-full w-full object-cover"
            fallbackClassName="h-full w-full bg-bg-card"
          />
        </span>
      ))}
    </div>
  )
}

const CATEGORY_ICON: Record<MilestoneCategory, typeof Shield> = {
  truegold: Sparkle,
  heroes: Sword,
  pets: PawPrint,
  pvp: Shield,
  feature: Sparkle,
  master: Crown,
  fog: Mountains,
  'war-academy': Crown,
  other: CastleTurret,
}

const CATEGORY_TINT: Record<MilestoneCategory, string> = {
  truegold: '#ffdb8a',
  heroes: '#e25656',
  pets: '#7fc08a',
  pvp: '#c9883e',
  feature: '#ffe9a3',
  master: '#ffdb8a',
  fog: '#6fa8d6',
  'war-academy': '#dcd3bd',
  other: '#a89e89',
}

export function KingdomTimelineCard() {
  const { t } = useTranslation()
  const { milestones, loading, error } = useUpcomingMilestones(6)
  const now = new Date()

  const CATEGORY_LABEL: Record<MilestoneCategory, string> = {
    truegold: t('timeline.category.truegold'),
    heroes: t('timeline.category.heroes'),
    pets: t('timeline.category.pets'),
    pvp: t('timeline.category.pvp'),
    feature: t('timeline.category.feature'),
    master: t('timeline.category.master'),
    fog: t('timeline.category.fog'),
    'war-academy': t('timeline.category.warAcademy'),
    other: t('timeline.category.other'),
  }

  function daysToLabel(d: number) {
    if (d === 0) return t('timeline.relative.today')
    if (d === 1) return t('timeline.relative.tomorrow')
    if (d < 0) return t('timeline.relative.daysAgo', { days: Math.abs(d) })
    return t('timeline.relative.daysCount', { count: d })
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="card-hero card-hero--violet card-hero--glow-c"
    >
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
        <span
          className="icon-frame icon-frame--sm overflow-hidden"
          style={{ borderColor: 'rgba(159,178,204,0.45)', boxShadow: '0 0 18px -4px rgba(159,178,204,0.45)' }}
        >
          <ImageWithFallback
            src="/images/buildings/town-center-tg.png"
            alt="Kingdom 1652"
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
            fallbackClassName="h-7 w-7"
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow" style={{ color: '#9fb2cc' }}>Kingdom 1652</div>
          <h3 className="hero-title text-lg sm:text-xl mt-0.5 text-ink-cream">{t('hub.timeline.title')}</h3>
        </div>
        <span className="text-[10px] tracking-[0.28em] uppercase text-ink-mute shrink-0 mt-1">K1652</span>
      </div>

      {error ? (
        <div className="px-5 sm:px-6 py-4 flex gap-3 items-start text-sm">
          <WarningCircle size={16} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span className="text-ink-mute">{error.message}</span>
        </div>
      ) : loading ? (
        <div className="divide-y divide-gold/10">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-5 sm:px-6 py-4 animate-pulse flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-bg-elev" />
              <div className="flex-1">
                <div className="h-3 bg-bg-elev rounded w-32 mb-1.5" />
                <div className="h-2.5 bg-bg-elev rounded w-20" />
              </div>
              <div className="h-3 bg-bg-elev rounded w-16" />
            </div>
          ))}
        </div>
      ) : milestones.length === 0 ? (
        <div className="px-5 sm:px-6 py-6 text-center">
          <Crown size={24} weight="duotone" className="mx-auto text-gold-soft mb-2" />
          <p className="text-sm text-ink-paper">{t('hub.timeline.empty.title')}</p>
          <p className="text-xs text-ink-mute mt-1">
            {t('hub.timeline.empty.subtitle')}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gold/10">
          {milestones.map((m, idx) => {
            const Icon = CATEGORY_ICON[m.category]
            const tint = CATEGORY_TINT[m.category]
            const iconHit = resolveMilestoneIcon(m.category, m.name, m.iconUrl)
            const d = m.unlockDateUtc
              ? differenceInCalendarDays(new Date(m.unlockDateUtc), now)
              : null
            return (
              <motion.li
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.06, duration: 0.45 }}
              >
              <Link
                to={`/timeline/${m.slug}`}
                className="flex items-center gap-3 px-5 sm:px-6 py-3 hover:bg-gold/[0.04] transition-colors group"
              >
                {/* Icon / portrait stack.
                    When the resolver finds a "Gen N" milestone the heroes
                    array carries 3-4 portraits — we render them as a small
                    overlapping stack instead of a single avatar so the user
                    immediately sees who's coming. Single-hit milestones keep
                    the original framed-icon look. */}
                {iconHit?.heroes && iconHit.heroes.length > 1 ? (
                  <HeroStack
                    portraits={iconHit.heroes}
                    altLabel={CATEGORY_LABEL[m.category]}
                    tint={tint}
                  />
                ) : (
                  <span
                    className="shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-lg flex items-center justify-center border overflow-hidden"
                    style={{
                      background: `${tint}1A`,
                      borderColor: `${tint}55`,
                      color: tint,
                      boxShadow: `0 0 10px -4px ${tint}55`,
                    }}
                  >
                    {iconHit ? (
                      <ImageWithFallback
                        src={iconHit.src}
                        alt={CATEGORY_LABEL[m.category]}
                        className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
                        fallbackClassName="h-7 w-7"
                      />
                    ) : (
                      <Icon size={18} weight="duotone" />
                    )}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink-cream font-medium leading-tight truncate">
                    {m.name}
                  </div>
                  <div className="text-[10px] tracking-widest uppercase text-ink-mute mt-0.5">
                    {CATEGORY_LABEL[m.category]}
                    {m.unlockDateUtc && (
                      <span className="ml-2 text-ink-dim normal-case tracking-normal">
                        {format(new Date(m.unlockDateUtc), 'd MMM yyyy')}
                      </span>
                    )}
                  </div>
                </div>
                {d !== null && (
                  <div className="text-right shrink-0">
                    <div
                      className={cn(
                        'font-mono text-lg sm:text-xl tabular-nums leading-none',
                        d <= 7 ? 'text-gold' : 'text-ink-cream',
                      )}
                    >
                      {daysToLabel(d)}
                    </div>
                    <div className="text-[9px] tracking-[0.28em] uppercase text-ink-mute mt-1">
                      {d >= 0 ? t('hub.timeline.toGo') : t('hub.timeline.past')}
                    </div>
                  </div>
                )}
                <CaretRight
                  size={13}
                  weight="bold"
                  className="text-ink-mute group-hover:text-gold-soft group-hover:translate-x-0.5 transition-all shrink-0 ml-1"
                />
              </Link>
              </motion.li>
            )
          })}
        </ul>
      )}
    </motion.section>
  )
}
