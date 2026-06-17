import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ClipboardText,
  Clock,
  ListChecks,
  Plus,
  WarningCircle,
} from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import { usePolls } from '../hooks/usePolls'
import { isPollOpen } from '../repositories/polls'
import { AllyChip } from '../components/ui/AllyChip'
import { cn } from '../lib/cn'
import type { Poll } from '../types/domain'

type TabKey = 'open' | 'decided' | 'archived'

interface DerivedMeta {
  /** Hours remaining; null when no deadline / already closed */
  hoursRemaining: number | null
  /** True when an open poll is within 24h of closing */
  urgent: boolean
  /** Visual status used for badges + card tone */
  visual: 'open' | 'urgent' | 'decided' | 'archived'
  /** Localized countdown string */
  countdownLabel: string
}

function useDeriveMeta() {
  const { t } = useTranslation()
  return (poll: Poll): DerivedMeta => {
    const open = isPollOpen(poll)
    let hoursRemaining: number | null = null
    let countdownLabel: string
    if (poll.status === 'archived') {
      countdownLabel = t('polls.detail.countdown.archived')
    } else if (!open) {
      countdownLabel = t('polls.status.closed')
    } else if (!poll.closesAt) {
      countdownLabel = t('polls.status.open')
    } else {
      const ms = new Date(poll.closesAt).getTime() - Date.now()
      hoursRemaining = ms / 3_600_000
      const minutes = Math.round(ms / 60_000)
      if (minutes < 60) {
        countdownLabel = t('polls.countdown.minutes', { count: minutes })
      } else if (minutes < 60 * 24) {
        countdownLabel = t('polls.countdown.hours', { count: Math.round(minutes / 60) })
      } else {
        countdownLabel = t('polls.countdown.days', { count: Math.round(minutes / 60 / 24) })
      }
    }

    let visual: DerivedMeta['visual']
    if (poll.status === 'archived') visual = 'archived'
    else if (open) visual = hoursRemaining !== null && hoursRemaining < 24 ? 'urgent' : 'open'
    else visual = 'decided'

    return {
      hoursRemaining,
      urgent: visual === 'urgent',
      visual,
      countdownLabel,
    }
  }
}

export function Polls() {
  const { t } = useTranslation()
  const auth = useAuth()
  // Load archived too so the "Archived" tab actually has content. The repo
  // already gates by status, so unauthorized polls won't leak in.
  const { polls, loading, error } = usePolls({ includeArchived: true })
  const deriveMeta = useDeriveMeta()
  const [tab, setTab] = useState<TabKey>('open')

  const grouped = useMemo(() => {
    const open: Poll[] = []
    const decided: Poll[] = []
    const archived: Poll[] = []
    for (const p of polls) {
      if (p.status === 'archived') archived.push(p)
      else if (isPollOpen(p)) open.push(p)
      else decided.push(p)
    }
    return { open, decided, archived }
  }, [polls])

  const visiblePolls =
    tab === 'open' ? grouped.open : tab === 'decided' ? grouped.decided : grouped.archived

  return (
    <div className="container-narrow pt-7 pb-12 sm:pb-16">
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5 sm:mb-6 text-center"
      >
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-soft mb-1">
          {t('polls.eyebrow')}
        </div>
        <h1 className="hero-title text-2xl sm:text-3xl leading-none">{t('polls.title')}</h1>
        <p className="text-xs sm:text-sm text-ink-mute mt-1.5">
          {loading
            ? t('polls.loading')
            : t('polls.countLine', { count: grouped.open.length })}
          {auth.isAlly && (
            <span className="ml-2 inline-flex items-center gap-1.5">
              · <AllyChip /> · {t('polls.readOnly')}
            </span>
          )}
        </p>
        {error && (
          <div className="callout-warn mt-3 flex items-start gap-2 text-sm text-left">
            <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
            <span>{error.message}</span>
          </div>
        )}
        {auth.isAdmin && (
          <div className="mt-3">
            <Link
              to="/admin/polls"
              className="inline-flex items-center gap-1.5 text-[11px] tracking-wider uppercase text-gold-soft hover:text-gold transition-colors"
            >
              <Plus size={12} weight="bold" /> {t('polls.newPoll')}
            </Link>
          </div>
        )}
      </motion.header>

      {/* Status tabs */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <TabButton
          active={tab === 'open'}
          onClick={() => setTab('open')}
          label={t('polls.filters.open')}
          count={grouped.open.length}
        />
        <TabButton
          active={tab === 'decided'}
          onClick={() => setTab('decided')}
          label={t('polls.filters.closed')}
          count={grouped.decided.length}
        />
        <TabButton
          active={tab === 'archived'}
          onClick={() => setTab('archived')}
          label={t('polls.filters.archived')}
          count={grouped.archived.length}
        />
      </div>

      {loading ? (
        <ul className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li
              key={i}
              className="rounded-2xl bg-bg-card/40 border border-gold/10 animate-pulse h-[140px]"
            />
          ))}
        </ul>
      ) : visiblePolls.length === 0 ? (
        <EmptyState tab={tab} isAdmin={auth.isAdmin} />
      ) : (
        <ul className="grid gap-3">
          {visiblePolls.map((poll) => (
            <PollCard key={poll.id} poll={poll} meta={deriveMeta(poll)} />
          ))}
        </ul>
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] tracking-[0.2em] uppercase transition-colors',
        active
          ? 'border-gold/50 bg-gold/12 text-gold-soft shadow-[0_0_12px_rgba(244,207,115,0.18)]'
          : 'border-ink-mute/25 text-ink-mute hover:text-ink-cream hover:border-gold/30',
      )}
    >
      <span className="capitalize">{label}</span>
      <span
        className={cn(
          'inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-mono px-1',
          active ? 'bg-gold/20 text-gold-soft' : 'bg-bg-deep/60 text-ink-mute',
        )}
      >
        {count}
      </span>
    </button>
  )
}

function EmptyState({ tab, isAdmin }: { tab: TabKey; isAdmin: boolean }) {
  const { t } = useTranslation()
  const copy: Record<TabKey, string> = {
    open: 'No open motions right now.',
    decided: 'No decided motions yet.',
    archived: 'No archived motions.',
  }
  return (
    <div className="card p-10 text-center">
      <ListChecks size={32} weight="duotone" className="mx-auto text-ink-mute mb-3" />
      <h2 className="font-display-clean text-sm text-ink-cream tracking-wider uppercase">
        {copy[tab]}
      </h2>
      {isAdmin && tab === 'open' && (
        <p className="text-[12px] text-ink-mute mt-1">
          {t('polls.empty.adminPrefix')}{' '}
          <Link to="/admin/polls" className="text-gold-soft hover:underline">
            {t('polls.empty.adminLink')}
          </Link>
          .
        </p>
      )}
    </div>
  )
}

function PollCard({ poll, meta }: { poll: Poll; meta: DerivedMeta }) {
  const { t } = useTranslation()

  const tone =
    meta.visual === 'urgent'
      ? 'card-hero card-hero--crimson card-hero--pulse'
      : meta.visual === 'decided'
        ? 'card-hero card-hero--success'
        : meta.visual === 'archived'
          ? 'card-hero opacity-60'
          : 'card-hero'

  // Participation is unknown at list-time (the repo only returns Poll).
  // Skip the participation ring entirely until vote counts are loaded —
  // graceful degradation per spec.
  const showParticipation = false

  return (
    <Link
      to={`/alliance/polls/${poll.slug}`}
      className={cn(
        tone,
        'block p-4 sm:p-5 hover:-translate-y-0.5 transition-transform group',
      )}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <StatusBadge status={meta.visual} />
        <span className="text-[10px] uppercase tracking-wider text-ink-mute">
          {poll.type === 'multi' ? t('polls.type.multi') : t('polls.type.single')}
        </span>
      </div>

      <h3 className="font-display-clean text-base sm:text-lg text-ink-cream mt-0.5 line-clamp-2 leading-snug">
        {poll.title}
      </h3>
      {poll.description && (
        <p className="text-xs text-ink-mute mt-1 line-clamp-1">{poll.description}</p>
      )}

      <div className="mt-3 flex items-center justify-between text-[11px] text-ink-mute gap-3">
        <span className="inline-flex items-center gap-1.5">
          {showParticipation ? (
            <>
              <ParticipationRing percent={0} size={12} />
              <span>0/0 voted</span>
            </>
          ) : (
            <>
              <ClipboardText size={12} weight="duotone" className="text-ink-mute" />
              <span className="capitalize">{poll.status}</span>
            </>
          )}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1',
            meta.urgent && 'text-crimson-glow font-medium',
          )}
        >
          <Clock size={12} weight="bold" />
          {meta.countdownLabel}
        </span>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: DerivedMeta['visual'] }) {
  const styles: Record<DerivedMeta['visual'], string> = {
    open: 'bg-success/15 text-success border-success/40',
    urgent: 'bg-crimson/15 text-crimson-glow border-crimson-glow/40',
    decided: 'bg-gold/12 text-gold-soft border-gold/40',
    archived: 'bg-bg-deep/40 text-ink-mute border-ink-mute/30',
  }
  const labels: Record<DerivedMeta['visual'], string> = {
    open: 'Open',
    urgent: 'Closing soon',
    decided: 'Decided',
    archived: 'Archived',
  }
  return (
    <span
      className={cn(
        'text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  )
}

function ParticipationRing({ percent, size = 14 }: { percent: number; size?: number }) {
  const clamped = Math.max(0, Math.min(100, percent))
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `conic-gradient(#7fc08a ${clamped}%, rgba(127,192,138,0.18) 0)`,
        display: 'inline-block',
      }}
    />
  )
}
