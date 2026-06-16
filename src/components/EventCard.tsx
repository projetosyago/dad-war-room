import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Lock, Sparkle, Archive } from '@phosphor-icons/react'
import type { GameEvent } from '../types/domain'
import { ImageWithFallback } from './ui/ImageWithFallback'
import { cn } from '../lib/cn'

interface EventCardProps {
  event: GameEvent
  index?: number
}

export function EventCard({ event, index = 0 }: EventCardProps) {
  const { t } = useTranslation()
  const isActive = event.status === 'active'
  const isArchived = event.status === 'archived'
  const accent = event.accentColor ?? '#ffdb8a'

  const inner = (
    <>
      {/* Active card ember glow */}
      {isActive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${accent}33 0%, transparent 55%)`,
          }}
        />
      )}

      <div className="relative flex items-center justify-center pt-6 pb-3 sm:pt-7">
        <span
          aria-hidden
          className={cn(
            'absolute h-24 w-24 rounded-full blur-2xl transition-opacity duration-500',
            isActive ? 'opacity-100' : 'opacity-40',
          )}
          style={{ background: `${accent}40` }}
        />
        <motion.div
          whileHover={isActive ? { y: -4, scale: 1.04 } : undefined}
          whileTap={isActive ? { scale: 0.97 } : undefined}
          transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          className="relative"
        >
          <ImageWithFallback
            src={event.iconUrl ?? '/images/events/bear-hunt.png'}
            alt={event.shortName ?? event.name}
            className={cn(
              'h-20 w-20 sm:h-24 sm:w-24 object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.55)]',
              !isActive && 'opacity-55 grayscale-[55%]',
            )}
            fallbackClassName="h-20 w-20 sm:h-24 sm:w-24"
          />
        </motion.div>
      </div>

      <div className="px-5 pb-5 pt-2 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {isActive ? (
            <span className="badge-active gap-1">
              <Sparkle size={11} weight="fill" />
              {t('events.status.active')}
            </span>
          ) : isArchived ? (
            <span className="badge-mute gap-1.5">
              <Archive size={11} weight="duotone" />
              {t('events.status.archived')}
            </span>
          ) : (
            <span className="badge-mute gap-1.5">
              <Lock size={11} weight="duotone" />
              {t('events.status.comingSoon')}
            </span>
          )}
        </div>

        <h3 className="font-display-clean text-base sm:text-lg tracking-wider text-gold-soft uppercase mb-1 text-balance">
          {event.shortName ?? event.name}
        </h3>
        <p
          className={cn(
            'text-xs sm:text-[13px] leading-snug text-balance min-h-[36px]',
            isActive ? 'text-ink-paper' : 'text-ink-mute',
          )}
        >
          {event.description ?? event.name}
        </p>

        {isActive && event.guideRoute ? (
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gold transition-transform duration-300 group-hover:translate-x-1">
            {t('events.card.openGuide')}
            <ArrowRight size={14} weight="bold" />
          </div>
        ) : (
          <div className="mt-4 text-[10px] uppercase tracking-[0.28em] text-ink-dim">
            {isArchived ? t('events.card.noLongerActive') : t('events.card.stayTuned')}
          </div>
        )}
      </div>
    </>
  )

  const cardClasses = cn(
    'group relative overflow-hidden rounded-2xl transition-all duration-300',
    isActive ? 'card-elev card-featured hover:shadow-card-hover hover:-translate-y-1' : 'card',
    !isActive && 'opacity-70 cursor-not-allowed',
    isArchived && 'opacity-60',
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      {isActive && event.guideRoute ? (
        <Link to={event.guideRoute} className={cardClasses} aria-label={event.name}>
          {inner}
        </Link>
      ) : (
        <div className={cardClasses} aria-disabled="true">
          {inner}
        </div>
      )}
    </motion.div>
  )
}
