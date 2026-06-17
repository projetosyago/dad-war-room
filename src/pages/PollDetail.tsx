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
  WarningCircle,
} from '@phosphor-icons/react'
import { useAuth } from '../hooks/useAuth'
import { usePoll } from '../hooks/usePolls'
import {
  clearAllVotesForPoll,
  clearVote,
  isPollOpen,
  shouldShowResults,
  tallyVotes,
  vote as castVote,
} from '../repositories/polls'
import { AllyChip } from '../components/ui/AllyChip'
import { markdownToHtml } from '../lib/markdown'
import { cn } from '../lib/cn'

interface CountdownInfo { label: string; tone: 'open' | 'soon' | 'closed' | 'draft' }
function useFormatCountdown() {
  const { t } = useTranslation()
  return (poll: { status: string; closesAt: string | null; closedAt: string | null }): CountdownInfo => {
    if (poll.status === 'archived') return { label: t('polls.detail.countdown.archived'), tone: 'closed' }
    if (poll.status === 'draft') return { label: t('polls.detail.countdown.draftNotPublished'), tone: 'draft' }
    if (poll.status === 'closed') {
      if (poll.closedAt) {
        const closedDate = new Date(poll.closedAt)
        return {
          label: t('polls.detail.countdown.closedAt', {
            date: closedDate.toLocaleDateString(),
            time: closedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }),
          tone: 'closed',
        }
      }
      return { label: t('polls.status.closed'), tone: 'closed' }
    }
    if (!poll.closesAt) return { label: t('polls.detail.countdown.openIndefinitely'), tone: 'open' }
    const ms = new Date(poll.closesAt).getTime() - Date.now()
    if (ms <= 0) return { label: t('polls.status.closed'), tone: 'closed' }
    const minutes = Math.round(ms / 60_000)
    if (minutes < 60) return { label: t('polls.countdown.minutes', { count: minutes }), tone: 'soon' }
    const hours = Math.round(minutes / 60)
    if (hours < 24) return { label: t('polls.countdown.hours', { count: hours }), tone: hours < 6 ? 'soon' : 'open' }
    const days = Math.round(hours / 24)
    return { label: t('polls.countdown.days', { count: days }), tone: 'open' }
  }
}

export function PollDetail() {
  const { t } = useTranslation()
  const formatCountdown = useFormatCountdown()
  const { slug } = useParams<{ slug: string }>()
  const auth = useAuth()
  const { poll, loading, error: loadError, refetch } = usePoll(slug)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Auto-clear the "copied" tooltip after a couple seconds.
  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(t)
  }, [copied])

  const myVotes = useMemo(() => {
    if (!poll || !auth.account) return new Set<string>()
    return new Set(
      poll.votes.filter((v) => v.accountId === auth.account!.id).map((v) => v.optionId),
    )
  }, [poll, auth.account])

  const tallied = useMemo(() => (poll ? tallyVotes(poll) : []), [poll])
  const totalVotes = poll?.votes.length ?? 0
  const totalVoters = useMemo(() => {
    if (!poll) return 0
    return new Set(poll.votes.map((v) => v.accountId)).size
  }, [poll])

  if (loading) {
    return (
      <div className="container-narrow py-8">
        <div className="card p-6 animate-pulse h-40" />
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
    // Short share URL: /p/<token>. Compact for pasting in in-game chat.
    const url = `${window.location.origin}/p/${poll!.shareToken}`
    try {
      if (navigator.share) {
        await navigator.share({ title: poll!.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
      }
    } catch {
      // share dismissed or clipboard blocked — fall back silently
    }
  }

  return (
    <div className="container-narrow py-5 sm:py-10">
      {/* Back affordance lives in the sticky Header now (see Header.tsx). The
          NotFound branch above keeps its inline "back to polls" CTA — that's an
          empty-state action, not a header-style breadcrumb. */}
      <motion.header
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-5"
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="inline-flex items-center text-[10px] tracking-[0.20em] uppercase rounded bg-gold/10 text-gold-soft border border-gold/25 px-1.5 py-0.5">
            {poll.type === 'single' ? t('polls.type.singleChoice') : t('polls.type.multiChoice')}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1 text-[10px] tracking-[0.20em] uppercase',
              countdown.tone === 'open' && 'text-gold-soft',
              countdown.tone === 'soon' && 'text-warning',
              countdown.tone === 'closed' && 'text-ink-mute',
            )}
          >
            {countdown.tone === 'closed' ? (
              <LockSimple size={11} weight="duotone" />
            ) : (
              <Clock size={11} weight="duotone" />
            )}
            {countdown.label}
          </span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl text-ink-cream tracking-wider leading-tight">
          {poll.title}
        </h1>
        {descriptionHtml && (
          <div
            className="poll-description text-sm text-ink-paper mt-2 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        )}
      </motion.header>

      {/* Status / restriction banners */}
      {isDraft && (
        <div className="callout-warn mb-4 flex items-start gap-2 text-sm">
          <EyeSlash size={14} weight="duotone" className="text-gold-soft shrink-0 mt-0.5" />
          <span>
            {t('polls.detail.draftBanner.prefix')}{' '}
            <strong>{t('polls.detail.draftBanner.draft')}</strong>
            {t('polls.detail.draftBanner.suffix')}{' '}
            <Link to="/admin/polls" className="text-gold-soft hover:underline">{t('polls.detail.draftBanner.link')}</Link>.
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

      {/* Options */}
      <ul className="card divide-y divide-gold/15 overflow-hidden">
        {tallied.map(({ option, count }) => {
          const isMine = myVotes.has(option.id)
          const pct = totalVoters === 0 ? 0 : Math.round((count / totalVoters) * 100)
          return (
            <li key={option.id}>
              <button
                onClick={() => handleVote(option.id)}
                disabled={!canVote || busy}
                className={cn(
                  'w-full flex flex-col gap-1.5 px-4 sm:px-5 py-3.5 text-left transition-colors',
                  canVote ? 'hover:bg-gold/5' : 'cursor-default',
                  isMine && 'bg-gold/[0.06]',
                )}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className="shrink-0">
                    {isMine ? (
                      <CheckCircle size={18} weight="fill" className="text-gold-glow" />
                    ) : (
                      <Circle size={18} weight="duotone" className="text-ink-mute" />
                    )}
                  </span>
                  <span className={cn('flex-1 text-sm leading-tight', isMine ? 'text-ink-cream font-medium' : 'text-ink-paper')}>
                    {option.label}
                  </span>
                  {showResults && (
                    <span className="text-[11px] tracking-widest uppercase text-gold-soft tabular-nums shrink-0">
                      {count} · {pct}%
                    </span>
                  )}
                </div>
                {showResults && (
                  <div className="h-1 bg-bg-deep rounded-full overflow-hidden ml-7 mt-0.5">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        isMine ? 'bg-gold-gradient' : 'bg-gold/40',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Footer actions */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-[11px] text-ink-mute leading-snug flex-1">
          {showResults ? (
            <>
              {t('polls.detail.voterCount', { count: totalVoters })}
              {poll.type === 'multi' && <> · {t('polls.detail.totalPicks', { count: totalVotes })}</>}
            </>
          ) : (
            <>{t('polls.detail.resultsHiddenShort')}</>
          )}
          {canVote && myVotes.size > 0 && (
            <>
              {' '}· {t('polls.detail.reVotePrefix')} <span className="text-gold-soft">{countdown.label.toLowerCase()}</span>.
            </>
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          {canVote && myVotes.size > 0 && (
            <button
              onClick={handleClearAll}
              disabled={busy}
              className="btn-ghost text-xs disabled:opacity-60"
            >
              {t('polls.detail.clearMyVote')}
            </button>
          )}
          <button onClick={handleShare} className="btn-ghost text-xs" title={t('polls.detail.shareTitle')}>
            {copied ? <Copy size={13} weight="duotone" /> : <ShareNetwork size={13} weight="duotone" />}
            {copied ? t('polls.detail.copied') : t('polls.detail.share')}
          </button>
        </div>
      </div>
    </div>
  )
}
