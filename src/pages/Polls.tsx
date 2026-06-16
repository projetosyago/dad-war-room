import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle,
  Clock,
  LockSimple,
  ListChecks,
  RadioButton,
  WarningCircle,
} from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import { usePolls } from '../hooks/usePolls'
import { isPollOpen } from '../repositories/polls'
import { AllyChip } from '../components/ui/AllyChip'
import { cn } from '../lib/cn'
import type { Poll } from '../types/domain'

function useFormatCountdown() {
  const { t } = useTranslation()
  return (poll: Poll): string => {
    if (poll.status === 'closed' || poll.status === 'archived') return t('polls.status.closed')
    if (poll.status === 'draft') return t('polls.status.draft')
    if (!poll.closesAt) return t('polls.status.open')
    const ms = new Date(poll.closesAt).getTime() - Date.now()
    if (ms <= 0) return t('polls.status.closed')
    const minutes = Math.round(ms / 60_000)
    if (minutes < 60) return t('polls.countdown.minutes', { count: minutes })
    const hours = Math.round(minutes / 60)
    if (hours < 24) return t('polls.countdown.hours', { count: hours })
    const days = Math.round(hours / 24)
    return t('polls.countdown.days', { count: days })
  }
}

export function Polls() {
  const { t } = useTranslation()
  const auth = useAuth()
  const { polls, loading, error } = usePolls()

  return (
    <div className="container-wide pt-5 pb-12 sm:pt-10 sm:pb-16">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 sm:mb-6"
      >
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-1">{t('polls.eyebrow')}</div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-none">
          {t('polls.title')}
        </h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {loading ? t('polls.loading') : t('polls.countLine', { count: polls.length })}
          {auth.isAlly && (
            <span className="ml-2 inline-flex items-center gap-1.5">
              · <AllyChip /> · {t('polls.readOnly')}
            </span>
          )}
        </p>
        {error && (
          <div className="callout-warn mt-3 flex items-start gap-2 text-sm">
            <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
      </motion.header>

      {loading ? (
        <ul className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <li
              key={i}
              className="rounded-2xl bg-bg-card/40 border border-gold/10 animate-pulse h-[120px]"
            />
          ))}
        </ul>
      ) : polls.length === 0 ? (
        <div className="card p-10 text-center">
          <ListChecks size={32} weight="duotone" className="mx-auto text-ink-mute mb-3" />
          <h2 className="font-display-clean text-sm text-ink-cream tracking-wider uppercase">
            {t('polls.empty.title')}
          </h2>
          <p className="text-[12px] text-ink-mute mt-1">
            {t('polls.empty.adminPrefix')}{' '}
            <Link to="/admin/polls" className="text-gold-soft hover:underline">
              {t('polls.empty.adminLink')}
            </Link>
            .
          </p>
        </div>
      ) : (
        <ul
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}
        >
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </ul>
      )}
    </div>
  )
}

function PollCard({ poll }: { poll: Poll }) {
  const { t } = useTranslation()
  const formatCountdown = useFormatCountdown()
  const open = isPollOpen(poll)
  const countdown = formatCountdown(poll)
  const TypeIcon = poll.type === 'single' ? RadioButton : ListChecks

  return (
    <Link
      to={`/alliance/polls/${poll.slug}`}
      className={cn(
        'card p-4 sm:p-5 flex flex-col gap-3 hover:border-gold/40 hover:-translate-y-0.5 transition-all group',
        !open && 'opacity-75',
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'h-9 w-9 rounded-lg border flex items-center justify-center shrink-0',
            open ? 'border-gold/30 bg-gold/8' : 'border-ink-dim/40 bg-bg-elev/50',
          )}
        >
          <TypeIcon
            size={15}
            weight="duotone"
            className={open ? 'text-gold-soft' : 'text-ink-mute'}
          />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display-clean text-sm text-ink-cream tracking-wider leading-tight">
            {poll.title}
          </h3>
          {poll.description && (
            <p className="text-[11px] text-ink-mute mt-1 line-clamp-2 leading-snug">
              {poll.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap text-[10px] tracking-[0.18em] uppercase">
        <span className="inline-flex items-center gap-1 bg-gold/10 text-gold-soft border border-gold/25 rounded px-1.5 py-0.5">
          {poll.type === 'single' ? t('polls.type.single') : t('polls.type.multi')}
        </span>
        {open ? (
          <span className="inline-flex items-center gap-1 text-gold-soft">
            <Clock size={10} weight="duotone" /> {countdown}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-ink-mute">
            <LockSimple size={10} weight="duotone" /> {t('polls.status.closed')}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-gold group-hover:translate-x-1 transition-transform">
          <CheckCircle size={10} weight="duotone" /> {t('polls.view')}
        </span>
      </div>
    </Link>
  )
}
