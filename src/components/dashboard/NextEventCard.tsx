import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarPlus, Clock, ArrowRight, WarningCircle } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { useNextOccurrence } from '../../hooks/useOccurrences'
import { useCountdown } from '../../hooks/useCountdown'
import { useAuth } from '../../hooks/useAuth'
import { ImageWithFallback } from '../ui/ImageWithFallback'

function TimeBlock({ value, label }: { value: number; label: string }) {
  const padded = String(Math.max(0, value)).padStart(2, '0')
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-2xl sm:text-4xl text-gold tabular-nums leading-none">
        {padded}
      </span>
      <span className="text-[9px] sm:text-[10px] tracking-[0.28em] uppercase text-ink-mute mt-1">
        {label}
      </span>
    </div>
  )
}

function Separator() {
  return <span className="font-mono text-xl sm:text-3xl text-gold/40 leading-none">:</span>
}

export function NextEventCard() {
  const { t } = useTranslation()
  const { occurrence, loading, error } = useNextOccurrence()
  const cd = useCountdown(occurrence?.startsAtUtc ?? null)
  const auth = useAuth()

  if (loading) {
    return (
      <div className="card-elev p-6 animate-pulse min-h-[200px]">
        <div className="h-3 bg-bg-elev rounded w-24 mb-3" />
        <div className="h-6 bg-bg-elev rounded w-56 mb-5" />
        <div className="h-16 bg-bg-elev rounded w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="callout-warn flex gap-3 items-start">
        <WarningCircle size={18} weight="duotone" className="text-danger shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-semibold text-ink">{t('hub.nextEvent.loadError')}</div>
          <div className="text-ink-mute mt-0.5">{error.message}</div>
        </div>
      </div>
    )
  }

  if (!occurrence) {
    return (
      <div className="card-elev card-featured p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-2">{t('hub.nextEvent.eyebrow')}</div>
        <div className="flex flex-col items-center gap-3">
          <CalendarPlus size={28} weight="duotone" className="text-gold-soft" />
          <h2 className="font-display-clean text-xl sm:text-2xl text-gold tracking-wider">
            {t('hub.nextEvent.empty.title')}
          </h2>
          <p className="text-sm text-ink-mute max-w-md">
            {t('hub.nextEvent.empty.subtitle')}
          </p>
          {auth.isAdmin && (
            <Link to="/admin/occurrences" className="btn-gold mt-2">
              <CalendarPlus size={16} weight="duotone" />
              {t('hub.nextEvent.addEvent')}
            </Link>
          )}
        </div>
      </div>
    )
  }

  const { event } = occurrence

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="card-hero card-hero--crimson"
    >
      <div className="flex items-start justify-between gap-3 p-5 sm:p-6 pb-2">
        <div className="flex items-center gap-3">
          <div
            className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center shrink-0 bg-bg-card/80"
            style={{
              border: '1px solid rgba(226,86,86,0.45)',
              boxShadow: '0 0 18px -4px rgba(226,86,86,0.55)',
            }}
          >
            <ImageWithFallback
              src={event.iconUrl ?? '/images/events/bear-hunt.png'}
              alt={event.name}
              className="h-9 w-9 sm:h-10 sm:w-10 object-contain"
              fallbackClassName="h-9 w-9"
            />
          </div>
          <div>
            <div className="eyebrow" style={{ color: '#e25656' }}>{t('hub.nextEvent.eyebrow')}</div>
            <h2 className="font-display-clean text-lg sm:text-xl text-ink-cream tracking-wider mt-0.5">
              {event.shortName ?? event.name}
            </h2>
            {occurrence.phaseLabel && (
              <span className="badge-gold text-[10px] mt-1">{occurrence.phaseLabel}</span>
            )}
          </div>
        </div>

        {event.guideRoute && (
          <Link
            to={event.guideRoute}
            className="hidden sm:inline-flex btn-ghost text-xs !min-h-[36px] !py-1.5 !px-3"
          >
            {t('hub.nextEvent.guide')}
            <ArrowRight size={14} weight="bold" />
          </Link>
        )}
      </div>

      <div className="px-5 sm:px-6 py-4">
        {cd?.past ? (
          <div className="callout-warn text-sm">
            {t('hub.nextEvent.startedAgo', { days: cd.days, hours: cd.hours })}
          </div>
        ) : cd ? (
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <TimeBlock value={cd.days} label={t('hub.nextEvent.countdown.days')} />
            <Separator />
            <TimeBlock value={cd.hours} label={t('hub.nextEvent.countdown.hours')} />
            <Separator />
            <TimeBlock value={cd.minutes} label={t('hub.nextEvent.countdown.min')} />
            <Separator />
            <TimeBlock value={cd.seconds} label={t('hub.nextEvent.countdown.sec')} />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-3 border-t border-gold/15 bg-bg/30">
        <div className="flex items-center gap-2 text-xs text-ink-mute">
          <Clock size={13} weight="duotone" className="text-gold-soft" />
          <span className="tabular-nums">
            {format(new Date(occurrence.startsAtUtc), 'EEE d MMM · HH:mm')}
          </span>
          <span
            className="text-[9px] tracking-[0.28em] uppercase text-gold-soft border border-gold/30 rounded px-1 py-0.5"
            title={t('hub.nextEvent.utcTitle')}
          >
            UTC
          </span>
        </div>
        {event.guideRoute && (
          <Link
            to={event.guideRoute}
            className="sm:hidden inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold"
          >
            {t('hub.nextEvent.guide')} <ArrowRight size={12} weight="bold" />
          </Link>
        )}
      </div>
    </motion.div>
  )
}
