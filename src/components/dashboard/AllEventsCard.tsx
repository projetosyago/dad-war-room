import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { WarningCircle } from '@phosphor-icons/react'
import { useEvents } from '../../hooks/useEvents'
import type { EventStatus, GameEvent } from '../../types/domain'
import { EventCard } from '../EventCard'
import { cn } from '../../lib/cn'

export function AllEventsCard() {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<EventStatus | 'all'>('all')
  const { events, loading, error } = useEvents()

  const FILTERS: { id: EventStatus | 'all'; label: string }[] = [
    { id: 'all', label: t('events.filter.all') },
    { id: 'active', label: t('events.filter.active') },
    { id: 'coming-soon', label: t('events.filter.comingSoon') },
    { id: 'archived', label: t('events.filter.archived') },
  ]

  const visible: GameEvent[] = useMemo(() => {
    if (filter === 'all') return events.filter((e) => e.status !== 'archived')
    return events.filter((e) => e.status === filter)
  }, [events, filter])

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.15 }}
      className="relative"
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 -mx-1 px-1 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              'shrink-0 inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.18em] transition-all border',
              filter === f.id
                ? 'bg-gold-gradient text-bg-deep border-gold shadow-gold-soft'
                : 'bg-bg-card/50 text-ink-soft border-gold/15 hover:border-gold/40 hover:text-ink-cream',
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] tracking-[0.28em] uppercase text-ink-mute pr-1">
          {visible.length}
        </span>
      </div>

      {error ? (
        <div className="callout-warn flex gap-3 items-start">
          <WarningCircle size={16} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span className="text-ink-mute text-sm">{error.message}</span>
        </div>
      ) : loading ? (
        <div
          className="grid gap-3 sm:gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card animate-pulse min-h-[200px]" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-mute">
          {t('events.empty.filter')}
        </div>
      ) : (
        <div
          className="grid gap-3 sm:gap-4"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
        >
          {visible.map((e, i) => (
            <EventCard key={e.id} event={e} index={i} />
          ))}
        </div>
      )}
    </motion.section>
  )
}
