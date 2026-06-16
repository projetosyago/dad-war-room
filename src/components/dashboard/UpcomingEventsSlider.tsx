import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { format, isToday, isTomorrow, formatDistanceToNowStrict } from 'date-fns'
import { ArrowRight, CalendarBlank, Sparkle } from '@phosphor-icons/react'
import { useUpcomingOccurrences } from '../../hooks/useOccurrences'
import { ImageWithFallback } from '../ui/ImageWithFallback'

const MAX = 5

/**
 * Horizontally swipeable row of the next 5 event occurrences — built to
 * match the NextEventCard aesthetic (radial glow, gold beam, hero title,
 * footer strip). Each slide card itself is mini-hero shaped so the row
 * doesn't feel like a generic strip.
 */
export function UpcomingEventsSlider() {
  const { t } = useTranslation()
  const { items, loading } = useUpcomingOccurrences(14)
  const upcoming = useMemo(() => items.slice(0, MAX), [items])

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-hero"
    >
      <div className="flex items-start gap-3 p-5 sm:p-6 pb-3">
        <span className="icon-frame text-gold-soft">
          <CalendarBlank size={22} weight="duotone" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">{t('events.upcoming.eyebrow')}</div>
          <h2 className="hero-title text-lg sm:text-xl mt-0.5">{t('events.upcoming.title')}</h2>
          <p className="text-xs text-ink-mute mt-1">
            {t('events.upcoming.subtitle')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="px-5 sm:px-6 pb-4 flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] min-w-[230px] rounded-xl bg-bg-card/70 border border-gold/15 animate-pulse"
            />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <p className="px-5 sm:px-6 pb-5 text-sm text-ink-mute">
          {t('events.upcoming.empty')}
        </p>
      ) : (
        <ul className="flex gap-3 overflow-x-auto snap-x no-scrollbar px-5 sm:px-6 pb-4">
          {upcoming.map((occ) => (
            <li key={occ.id} className="snap-start shrink-0 w-[78%] sm:w-[260px]">
              <EventSlide occurrence={occ} />
            </li>
          ))}
        </ul>
      )}

      <div className="card-foot">
        <span className="text-[11px] text-ink-mute">
          {upcoming.length > 0 ? t('events.upcoming.eventCount', { count: upcoming.length }) : '—'}
        </span>
        <Link
          to="/events"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.22em] text-gold-soft hover:text-gold-shimmer"
        >
          {t('events.upcoming.viewAll')}
          <ArrowRight size={12} weight="bold" />
        </Link>
      </div>
    </motion.div>
  )
}

function useRelativeLabel() {
  const { t } = useTranslation()
  return (date: Date): string => {
    if (isToday(date)) return t('events.upcoming.today')
    if (isTomorrow(date)) return t('events.upcoming.tomorrow')
    return formatDistanceToNowStrict(date, { addSuffix: true })
  }
}

function EventSlide({
  occurrence,
}: {
  occurrence: {
    id: string
    startsAtUtc: string
    phaseLabel: string | null
    event: {
      name: string
      shortName: string | null
      accentColor: string | null
      guideRoute: string | null
      slug: string
      iconUrl: string | null
    }
  }
}) {
  const relativeLabel = useRelativeLabel()
  const start = new Date(occurrence.startsAtUtc)
  const accent = occurrence.event.accentColor ?? '#f4cf73'

  const inner = (
    <div
      className="relative rounded-xl overflow-hidden border border-gold/30 bg-bg-card/85 h-full transition-all hover:border-gold/55 hover:-translate-y-0.5 group"
      style={{
        backgroundImage: `radial-gradient(500px 200px at 0% 0%, ${accent}22, transparent 60%)`,
        boxShadow: '0 18px 30px -18px rgba(0,0,0,0.55)',
      }}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }}
      />
      <div className="flex items-start gap-3 px-4 pt-4 pb-3">
        <span
          className="h-11 w-11 rounded-lg flex items-center justify-center shrink-0 border border-gold/30 bg-bg/50"
          style={{ boxShadow: `0 0 14px -4px ${accent}88` }}
        >
          {occurrence.event.iconUrl ? (
            <ImageWithFallback
              src={occurrence.event.iconUrl}
              alt=""
              className="h-7 w-7 object-contain"
              fallbackClassName="h-7 w-7"
            />
          ) : (
            <Sparkle size={16} weight="duotone" className="text-gold-soft" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="eyebrow text-[9px]">{relativeLabel(start)}</div>
          <div className="font-display-clean text-sm sm:text-base text-ink-cream tracking-wider truncate mt-0.5">
            {occurrence.event.shortName ?? occurrence.event.name}
          </div>
          {occurrence.phaseLabel && (
            <div className="text-[11px] text-gold-soft mt-1 truncate inline-flex items-center gap-1">
              <Sparkle size={10} weight="duotone" />
              {occurrence.phaseLabel}
            </div>
          )}
        </div>
      </div>
      <div
        className="flex items-center justify-between px-4 py-2 text-[11px]"
        style={{ borderTop: '1px solid rgba(244,207,115,0.15)', background: 'rgba(15,18,36,0.4)' }}
      >
        <span className="font-mono text-gold tabular-nums">
          {format(start, 'EEE · HH:mm')}
        </span>
        <ArrowRight
          size={13}
          weight="bold"
          className="text-gold-soft group-hover:translate-x-1 transition-transform"
        />
      </div>
    </div>
  )

  if (occurrence.event.guideRoute) {
    return (
      <Link to={occurrence.event.guideRoute} className="block h-full">
        {inner}
      </Link>
    )
  }
  return (
    <Link to="/events" className="block h-full">
      {inner}
    </Link>
  )
}
