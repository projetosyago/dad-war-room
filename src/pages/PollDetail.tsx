import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  CheckCircle,
  Circle,
  Clock,
  Copy,
  EyeSlash,
  LockSimple,
  ShareNetwork,
  ShieldWarning,
  SignIn,
  Trophy,
  Users,
  WarningCircle,
} from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import { useCountdown } from '../hooks/useCountdown'
import { usePoll } from '../hooks/usePolls'
import {
  clearAllVotesForPoll,
  clearVote,
  isPollOpen,
  shouldShowResults,
  tallyVotes,
  vote as castVote,
} from '../repositories/polls'
import type { PollWithDetails } from '../types/domain'
import { AllyChip } from '../components/ui/AllyChip'
import { markdownToHtml } from '../lib/markdown'
import { cn } from '../lib/cn'

// ── Status / countdown helpers ─────────────────────────────────────────

type Tone = 'open' | 'soon' | 'urgent' | 'closed' | 'draft'

interface CountdownInfo {
  label: string
  tone: Tone
  /** Hours remaining; null when indefinite / closed / draft. */
  hoursLeft: number | null
}

function useFormatCountdown() {
  const { t } = useTranslation()
  return (poll: { status: string; closesAt: string | null; closedAt: string | null }): CountdownInfo => {
    if (poll.status === 'archived')
      return { label: t('polls.detail.countdown.archived'), tone: 'closed', hoursLeft: null }
    if (poll.status === 'draft')
      return { label: t('polls.detail.countdown.draftNotPublished'), tone: 'draft', hoursLeft: null }
    if (poll.status === 'closed') {
      if (poll.closedAt) {
        const closedDate = new Date(poll.closedAt)
        return {
          label: t('polls.detail.countdown.closedAt', {
            date: closedDate.toLocaleDateString(),
            time: closedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }),
          tone: 'closed',
          hoursLeft: null,
        }
      }
      return { label: t('polls.status.closed'), tone: 'closed', hoursLeft: null }
    }
    if (!poll.closesAt)
      return { label: t('polls.detail.countdown.openIndefinitely'), tone: 'open', hoursLeft: null }
    const ms = new Date(poll.closesAt).getTime() - Date.now()
    if (ms <= 0) return { label: t('polls.status.closed'), tone: 'closed', hoursLeft: 0 }
    const minutes = Math.round(ms / 60_000)
    const hours = ms / 3_600_000
    if (minutes < 60)
      return { label: t('polls.countdown.minutes', { count: minutes }), tone: 'urgent', hoursLeft: hours }
    const hoursRounded = Math.round(minutes / 60)
    if (hoursRounded < 24)
      return {
        label: t('polls.countdown.hours', { count: hoursRounded }),
        tone: hoursRounded < 6 ? 'urgent' : 'soon',
        hoursLeft: hours,
      }
    const days = Math.round(hoursRounded / 24)
    return { label: t('polls.countdown.days', { count: days }), tone: 'open', hoursLeft: hours }
  }
}

/** Map poll status + urgency → card-hero tone classes (gold / crimson+pulse / success). */
function heroToneClasses(poll: PollWithDetails, countdown: CountdownInfo): string {
  if (poll.status === 'archived') return 'card-hero opacity-70'
  if (poll.status === 'closed') return 'card-hero card-hero--success'
  if (poll.status === 'draft') return 'card-hero card-hero--steel'
  // open
  if (countdown.tone === 'urgent') return 'card-hero card-hero--crimson card-hero--pulse'
  return 'card-hero'
}

// ── Subcomponents (kept inline to avoid extra files) ───────────────────

function TimeBlock({ value, label }: { value: number; label: string }) {
  const padded = String(Math.max(0, value)).padStart(2, '0')
  return (
    <div className="flex flex-col items-center">
      <span className="font-mono text-2xl sm:text-3xl text-gold tabular-nums leading-none">{padded}</span>
      <span className="text-[9px] tracking-[0.28em] uppercase text-ink-mute mt-1">{label}</span>
    </div>
  )
}

function Sep() {
  return <span className="font-mono text-xl sm:text-2xl text-gold/40 leading-none">:</span>
}

function CountdownBlock({
  closesAt,
  countdown,
}: {
  closesAt: string | null
  countdown: CountdownInfo
}) {
  const { t } = useTranslation()
  const cd = useCountdown(closesAt)
  if (countdown.tone === 'closed' || countdown.tone === 'draft' || !cd || cd.past) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.20em] text-ink-mute">
        <LockSimple size={12} weight="duotone" />
        {countdown.label}
      </div>
    )
  }
  return (
    <div className="mt-4 flex items-end gap-2 sm:gap-3">
      <TimeBlock value={cd.days} label={t('hub.nextEvent.countdown.days')} />
      <Sep />
      <TimeBlock value={cd.hours} label={t('hub.nextEvent.countdown.hours')} />
      <Sep />
      <TimeBlock value={cd.minutes} label={t('hub.nextEvent.countdown.min')} />
      <Sep />
      <TimeBlock value={cd.seconds} label={t('hub.nextEvent.countdown.sec')} />
    </div>
  )
}

function StatusBadge({ poll, countdown }: { poll: PollWithDetails; countdown: CountdownInfo }) {
  const { t } = useTranslation()
  let label = t('polls.status.open')
  let cls = 'bg-gold/15 text-gold-soft border-gold/35'
  if (poll.status === 'draft') {
    label = t('polls.status.draft')
    cls = 'bg-steel/15 text-steel-soft border-steel/35'
  } else if (poll.status === 'closed' || poll.status === 'archived') {
    label = t('polls.status.closed')
    cls = 'bg-success/15 text-success border-success/35'
  } else if (countdown.tone === 'urgent') {
    cls = 'bg-crimson/20 text-crimson-soft border-crimson/45'
  }
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] tracking-[0.22em] uppercase rounded border px-1.5 py-0.5',
        cls,
      )}
    >
      {label}
    </span>
  )
}

function ParticipationDonut({ percent, size = 48 }: { percent: number; size?: number }) {
  const radius = (size - 6) / 2
  const circ = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, percent))
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(244,207,115,0.15)" strokeWidth={4} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#donut-grad)"
        strokeWidth={4}
        fill="none"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <defs>
        <linearGradient id="donut-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffdb8a" />
          <stop offset="100%" stopColor="#c89934" />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gold-soft font-mono"
        style={{ fontSize: 11 }}
      >
        {pct}%
      </text>
    </svg>
  )
}

/** 48h sparkline of vote timestamps — graceful when empty. */
function VoteTimelineSparkline({ votes }: { votes: { votedAt: string }[] }) {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    // refresh once per minute so the sparkline window slides forward
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const buckets = useMemo(() => {
    const BUCKETS = 24 // ~2h per bucket over 48h
    const windowMs = 48 * 3_600_000
    const start = now - windowMs
    const counts = new Array(BUCKETS).fill(0)
    for (const v of votes) {
      const ts = new Date(v.votedAt).getTime()
      if (ts < start || ts > now) continue
      const idx = Math.min(BUCKETS - 1, Math.floor(((ts - start) / windowMs) * BUCKETS))
      counts[idx]++
    }
    return counts
  }, [votes, now])

  const max = Math.max(1, ...buckets)
  const hasAny = buckets.some((c) => c > 0)

  if (!hasAny) {
    return (
      <div className="text-[10px] text-ink-mute font-mono">
        No votes in the last 48h yet — be the first to weigh in.
      </div>
    )
  }

  return (
    <div className="flex items-end gap-[3px] h-10">
      {buckets.map((c, i) => {
        const h = (c / max) * 100
        const lit = c > 0
        return (
          <div key={i} className="flex-1 flex items-end h-full">
            <div
              className={cn(
                'w-full rounded-sm transition-all',
                lit ? 'bg-gradient-to-t from-gold/40 to-gold-soft shadow-[0_0_4px_rgba(244,207,115,0.4)]' : 'bg-bg-deep',
              )}
              style={{ height: `${Math.max(lit ? 8 : 4, h)}%` }}
              title={`${c} vote${c === 1 ? '' : 's'}`}
            />
          </div>
        )
      })}
    </div>
  )
}

/** Stable hue from any string id — placeholder gradient for voters w/o avatars. */
function hueFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

function VoterChip({ id, size = 22 }: { id: string; size?: number }) {
  const hue = hueFromId(id)
  return (
    <div
      className="rounded-full border border-gold/30 shadow-[0_0_4px_rgba(244,207,115,0.25)] shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, hsl(${hue}, 55%, 55%), hsl(${(hue + 40) % 360}, 45%, 35%))`,
      }}
      aria-hidden
    />
  )
}

// ── Page ───────────────────────────────────────────────────────────────

export function PollDetail() {
  const { t } = useTranslation()
  const formatCountdown = useFormatCountdown()
  const { slug } = useParams<{ slug: string }>()
  const auth = useAuth()
  const { poll, loading, error: loadError, refetch } = usePoll(slug)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const myVotes = useMemo(() => {
    if (!poll || !auth.account) return new Set<string>()
    return new Set(poll.votes.filter((v) => v.accountId === auth.account!.id).map((v) => v.optionId))
  }, [poll, auth.account])

  const tallied = useMemo(() => (poll ? tallyVotes(poll) : []), [poll])
  const totalVotes = poll?.votes.length ?? 0
  const totalVoters = useMemo(() => {
    if (!poll) return 0
    return new Set(poll.votes.map((v) => v.accountId)).size
  }, [poll])

  // Distinct voter ids — first 8 become chips, rest collapse into "+N".
  const voterIds = useMemo(() => {
    if (!poll) return [] as string[]
    return Array.from(new Set(poll.votes.map((v) => v.accountId)))
  }, [poll])

  // Leading option ranked by count (ties: original order preserved by stable sort).
  const ranked = useMemo(() => {
    return [...tallied].sort((a, b) => b.count - a.count)
  }, [tallied])
  const leadingId = ranked.length && ranked[0].count > 0 ? ranked[0].option.id : null

  if (loading) {
    return (
      <div className="container-narrow py-8">
        <div className="card-hero p-6 animate-pulse h-48 mb-4" />
        <div className="card p-4 animate-pulse h-20" />
      </div>
    )
  }
  if (!poll) {
    return (
      <div className="container-narrow py-10 text-center">
        <ShieldWarning size={28} weight="duotone" className="mx-auto text-ink-mute mb-2" />
        <p className="text-sm text-ink-paper mb-4">{t('polls.detail.notFound')}</p>
        <Link to="/alliance/polls" className="btn-ghost text-xs">
          <ArrowLeft size={12} weight="bold" /> {t('polls.detail.backToPolls')}
        </Link>
      </div>
    )
  }

  const open = isPollOpen(poll)
  const countdown = formatCountdown(poll)
  const isDraft = poll.status === 'draft'
  const canVote = open && auth.status === 'signed-in' && auth.isVotingMember
  const showResults = shouldShowResults(poll, { isAdmin: auth.isAdmin })
  const descriptionHtml = poll.description ? markdownToHtml(poll.description) : ''
  const heroClasses = heroToneClasses(poll, countdown)
  // Participation: % of voters relative to total picks ceiling (informational only —
  // we don't have total-eligible-member count exposed in PollWithDetails). For multi
  // polls we use voters / max(voters, 1) which always reads 100% — so we surface
  // the absolute count instead and reserve the donut for "open vs total picks".
  const participationPct = totalVoters > 0 ? Math.min(100, Math.round((totalVoters / Math.max(totalVoters, 10)) * 100)) : 0

  async function handleVote(optionId: string) {
    if (!poll || !auth.account || busy) return
    setBusy(true)
    setError(null)
    try {
      const alreadyCast = myVotes.has(optionId)
      if (poll.type === 'multi' && alreadyCast) {
        await clearVote(poll.id, optionId, auth.account.id)
      } else {
        await castVote({ id: poll.id, type: poll.type }, optionId, auth.account.id)
      }
      await refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('polls.detail.voteFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function handleClearAll() {
    if (!poll || !auth.account || busy) return
    setBusy(true)
    setError(null)
    try {
      await clearAllVotesForPoll(poll.id, auth.account.id)
      await refetch()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('polls.detail.clearFailed'))
    } finally {
      setBusy(false)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/p/${poll!.shareToken}`
    try {
      if (navigator.share) {
        await navigator.share({ title: poll!.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
      }
    } catch {
      /* share dismissed / clipboard blocked — fall back silently */
    }
  }

  return (
    <div className="container-narrow py-5 sm:py-10 pb-24">
      {/* ── HERO ───────────────────────────────────────────────────── */}
      <motion.article
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(heroClasses, 'p-5 sm:p-6 mb-4')}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <StatusBadge poll={poll} countdown={countdown} />
          <span className="text-[10px] uppercase tracking-[0.20em] text-ink-mute">
            {poll.type === 'multi' ? t('polls.type.multiChoice') : t('polls.type.singleChoice')}
          </span>
          {countdown.tone !== 'closed' && countdown.tone !== 'draft' && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.20em]',
                countdown.tone === 'urgent' && 'text-crimson-soft',
                countdown.tone === 'soon' && 'text-warning',
                countdown.tone === 'open' && 'text-gold-soft',
              )}
            >
              <Clock size={11} weight="duotone" />
              {countdown.label}
            </span>
          )}
        </div>
        <h1 className="font-display text-xl sm:text-2xl text-ink-cream tracking-wider leading-tight">
          {poll.title}
        </h1>
        {descriptionHtml && (
          <div
            className="poll-description text-sm text-ink-paper mt-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
        <CountdownBlock closesAt={poll.closesAt} countdown={countdown} />
      </motion.article>

      {/* ── Banners ────────────────────────────────────────────────── */}
      {isDraft && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <EyeSlash size={14} weight="duotone" className="text-gold-soft shrink-0 mt-0.5" />
          <span>
            {t('polls.detail.draftBanner.prefix')}{' '}
            <strong>{t('polls.detail.draftBanner.draft')}</strong>
            {t('polls.detail.draftBanner.suffix')}{' '}
            <Link to="/admin/polls" className="text-gold-soft hover:underline">
              {t('polls.detail.draftBanner.link')}
            </Link>
            .
          </span>
        </div>
      )}
      {!showResults && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <EyeSlash size={14} weight="duotone" className="text-gold-soft shrink-0 mt-0.5" />
          <span>
            {poll.resultsVisibility === 'admin_only'
              ? t('polls.detail.resultsHidden.adminOnly')
              : t('polls.detail.resultsHidden.untilClose')}
          </span>
        </div>
      )}
      {auth.status === 'signed-out' && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <SignIn size={14} weight="duotone" className="text-gold-soft shrink-0 mt-0.5" />
          <span>
            <Link to="/login" className="text-gold-soft hover:underline">
              {t('auth.signIn')}
            </Link>{' '}
            {t('polls.detail.signedOutBanner')}
          </span>
        </div>
      )}
      {auth.isAlly && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <ShieldWarning size={14} weight="duotone" className="text-steel-soft shrink-0 mt-0.5" />
          <span>
            <AllyChip /> {t('polls.detail.allyBanner')}
          </span>
        </div>
      )}
      {error && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {loadError && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <WarningCircle size={14} weight="duotone" className="text-danger shrink-0 mt-0.5" />
          <span>{loadError.message}</span>
        </div>
      )}

      {/* ── Participation meter ────────────────────────────────────── */}
      {showResults && totalVoters > 0 && (
        <section className="card p-4 mb-4 flex items-center gap-3">
          <ParticipationDonut percent={participationPct} size={48} />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-ink-cream">
              {t('polls.detail.voterCount', { count: totalVoters })}
              {poll.type === 'multi' && (
                <span className="text-ink-mute"> · {t('polls.detail.totalPicks', { count: totalVotes })}</span>
              )}
            </div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-ink-mute mt-1 flex items-center gap-1">
              <Users size={11} weight="duotone" /> Council weighing in
            </div>
          </div>
        </section>
      )}

      {/* ── Vote results widget ────────────────────────────────────── */}
      <section className="space-y-2 mb-4">
        {ranked.map(({ option, count }, i) => {
          const isMine = myVotes.has(option.id)
          const pct = totalVoters === 0 ? 0 : Math.round((count / totalVoters) * 100)
          const isLeading = option.id === leadingId && i === 0
          return (
            <div
              key={option.id}
              className={cn(
                'card p-3 transition-all',
                isLeading && 'border-gold/55 shadow-[0_0_18px_-4px_rgba(244,207,115,0.40)]',
                isMine && !isLeading && 'bg-gold/[0.04]',
              )}
            >
              <button
                onClick={() => handleVote(option.id)}
                disabled={!canVote || busy}
                className={cn(
                  'w-full text-left',
                  canVote ? 'cursor-pointer' : 'cursor-default',
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="shrink-0">
                    {isMine ? (
                      <CheckCircle size={18} weight="fill" className="text-gold-glow" />
                    ) : (
                      <Circle size={18} weight="duotone" className="text-ink-mute" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'flex-1 text-sm leading-tight',
                      isMine ? 'text-ink-cream font-medium' : 'text-ink-paper',
                    )}
                  >
                    {option.label}
                  </span>
                  {showResults && (
                    <span className="font-mono text-base text-gold-soft font-semibold tabular-nums shrink-0">
                      {pct}%
                    </span>
                  )}
                </div>
                {showResults && (
                  <>
                    <div className="h-1 rounded-full bg-bg-deep overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          isLeading
                            ? 'bg-gradient-to-r from-gold to-gold-soft shadow-[0_0_4px_rgba(244,207,115,0.55)]'
                            : isMine
                              ? 'bg-gold-gradient'
                              : 'bg-gold/35',
                        )}
                        style={{ width: `${Math.max(2, pct)}%` }}
                      />
                    </div>
                    <div className="text-[10px] mt-1.5 text-ink-mute font-mono flex items-center gap-1.5">
                      <span>
                        {count} {count === 1 ? 'vote' : 'votes'}
                      </span>
                      {isLeading && (
                        <span className="inline-flex items-center gap-0.5 text-gold-soft uppercase tracking-[0.18em]">
                          <Trophy size={10} weight="duotone" /> Leading
                        </span>
                      )}
                    </div>
                  </>
                )}
              </button>
            </div>
          )
        })}
      </section>

      {/* ── Voters row ─────────────────────────────────────────────── */}
      {showResults && voterIds.length > 0 && (
        <section className="card p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-gold-soft">Who voted</h3>
            <span className="text-[10px] text-ink-mute font-mono">
              {t('polls.detail.voterCount', { count: voterIds.length })}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {voterIds.slice(0, 8).map((id) => (
              <VoterChip key={id} id={id} size={22} />
            ))}
            {voterIds.length > 8 && (
              <span className="text-[10px] text-ink-mute font-mono ml-1">+{voterIds.length - 8} more</span>
            )}
          </div>
        </section>
      )}

      {/* ── Timeline sparkline ─────────────────────────────────────── */}
      {showResults && (
        <section className="card p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[10px] uppercase tracking-[0.18em] text-gold-soft">Last 48 hours</h3>
            <span className="text-[10px] text-ink-mute font-mono">vote arrivals</span>
          </div>
          <VoteTimelineSparkline votes={poll.votes} />
          <div className="flex justify-between text-[9px] text-ink-mute font-mono mt-1.5 tracking-wider">
            <span>-48h</span>
            <span>now</span>
          </div>
        </section>
      )}

      {/* ── Sticky action bar ──────────────────────────────────────── */}
      {(
        <div className="sticky bottom-0 left-0 right-0 -mx-4 sm:-mx-6 mt-6 px-4 sm:px-6 py-3 bg-gradient-to-t from-bg-deep/95 to-bg-deep/70 border-t border-gold/30 backdrop-blur flex gap-2 z-20">
          {canVote && myVotes.size > 0 && (
            <button
              onClick={handleClearAll}
              disabled={busy}
              className="btn-ghost text-xs flex-1 disabled:opacity-60"
              title={t('polls.detail.clearMyVote')}
            >
              {t('polls.detail.clearMyVote')}
            </button>
          )}
          <button
            onClick={handleShare}
            className="btn-ghost text-xs flex-1"
            title={t('polls.detail.shareTitle')}
          >
            {copied ? <Copy size={13} weight="duotone" /> : <ShareNetwork size={13} weight="duotone" />}
            {copied ? t('polls.detail.copied') : t('polls.detail.share')}
          </button>
          {canVote && myVotes.size === 0 && (
            <span className="flex-1 text-[10px] text-ink-mute self-center text-center font-mono uppercase tracking-[0.18em]">
              Tap an option above to vote
            </span>
          )}
        </div>
      )}
    </div>
  )
}
